/**
 * Supabase Client (React Native)
 *
 * Port of the web app's `src/lib/supabaseClient.js`. Two things differ on
 * mobile:
 *
 *  1. Sessions persist through Expo SecureStore (chunked) instead of
 *     AsyncStorage / `localStorage`. Web still uses AsyncStorage.
 *  2. Token auto-refresh is tied to app foreground state, because timers are
 *     throttled or suspended while the app is backgrounded.
 *
 * Environment variables map 1:1 to the web app's `.env.local`:
 *   VITE_SUPABASE_URL      -> EXPO_PUBLIC_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY -> EXPO_PUBLIC_SUPABASE_ANON_KEY
 */
import "./polyfillWebCrypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState, type AppStateStatus } from "react-native";

import { getAuthStorage } from "@/lib/secureAuthStorage";

/**
 * A request left open across a background/foreground transition can sit on a
 * dead socket and never settle. Callers wait on that promise, and a token
 * refresh stuck this way blocks every later request. Cancelling rejects the
 * wrapper even when the native fetch ignores the abort.
 */
type InFlightRequest = {
  controller: AbortController;
  fail: (error: Error) => void;
};

const inFlightRequests = new Set<InFlightRequest>();

function connectionDroppedError(): Error {
  const error = new Error("Your connection dropped. Try again.");
  error.name = "AbortError";
  return error;
}

export function abortInFlightRequests(): void {
  const pending = [...inFlightRequests];
  inFlightRequests.clear();
  for (const request of pending) {
    request.controller.abort();
    request.fail(connectionDroppedError());
  }
}

function trackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const callerSignal = init?.signal;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else {
      callerSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  const request: InFlightRequest = {
    controller,
    fail: () => undefined,
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      inFlightRequests.delete(request);
      settle();
    };

    request.fail = (error) => {
      finish(() => reject(error));
    };

    inFlightRequests.add(request);
    try {
      fetch(input, { ...init, signal: controller.signal }).then(
        (response) => {
          finish(() => resolve(response));
        },
        (error: unknown) => {
          finish(() => reject(error));
        },
      );
    } catch (error) {
      request.fail(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

interface SupabaseExtra {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as SupabaseExtra;

// `process.env.EXPO_PUBLIC_*` reads are statically inlined at build time, so
// they must be written out literally rather than looked up dynamically.
const supabaseUrl: string | undefined =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl;

const supabaseAnonKey: string | undefined =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey;

const looksConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-ref") &&
    supabaseAnonKey !== "your-anon-key",
);

export const isSupabaseConfigured = looksConfigured;

// AsyncStorage touches `window` under the hood; skip it during SSR / Node
// (e.g. Expo static web render) so Metro doesn't crash on start.
const canUseNativeStorage = typeof window !== "undefined";

if (!isSupabaseConfigured) {
  console.error(
    "[supabase] Missing environment variables. Ensure EXPO_PUBLIC_SUPABASE_URL " +
      "and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in unideals-app/.env",
  );
}

const configuredSupabaseUrl = supabaseUrl ?? "https://placeholder.supabase.co";

/** Same key `createClient` derives from the project URL. */
export const authStorageKey = `sb-${new URL(configuredSupabaseUrl).hostname.split(".")[0]}-auth-token`;

export const supabase: SupabaseClient = createClient(
  configuredSupabaseUrl,
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      ...(canUseNativeStorage ? { storage: getAuthStorage() } : {}),
      autoRefreshToken: true,
      persistSession: canUseNativeStorage,
      flowType: "pkce",
      // There is no URL fragment to parse in a native runtime; deep-linked
      // auth callbacks are handled explicitly instead.
      detectSessionInUrl: false,
    },
    global: {
      fetch: trackedFetch,
    },
  },
);

/**
 * Drops the persisted session immediately. `removeItem` clears the in-memory
 * copy before it touches the Keychain, so a later read does not revive a
 * sign-out that got stuck after the app returned from the background.
 */
export function clearPersistedSession(): void {
  const storage = getAuthStorage();
  void storage.removeItem(authStorageKey);
  void storage.removeItem(`${authStorageKey}-user`);
  void storage.removeItem(`${authStorageKey}-code-verifier`);
}

let wasBackgrounded = false;
const resumeListeners = new Set<() => void>();
const realtimeReadyListeners = new Set<() => void>();

/** Runs after the app returns from a real background and the dead socket is dropped. */
export function subscribeToAppResume(listener: () => void): () => void {
  resumeListeners.add(listener);
  return () => {
    resumeListeners.delete(listener);
  };
}

/** Runs after the live connection has been closed and opened again. */
export function subscribeToRealtimeReady(listener: () => void): () => void {
  realtimeReadyListeners.add(listener);
  return () => {
    realtimeReadyListeners.delete(listener);
  };
}

async function reconnectRealtime(): Promise<void> {
  try {
    await supabase.realtime.disconnect();
  } catch (error) {
    console.warn("[supabase] Realtime disconnect skipped:", error);
  }

  try {
    supabase.realtime.connect();
  } catch (error) {
    console.warn("[supabase] Realtime reconnect skipped:", error);
  }

  for (const listener of realtimeReadyListeners) listener();
}

/**
 * Takes the idle connection the OS may have killed while the app was gone.
 * Aborting it drops that socket so the next real request opens a new one.
 */
function drainStaleConnection(): Promise<void> {
  if (!supabaseAnonKey) return Promise.resolve();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_000);
  return fetch(`${configuredSupabaseUrl}/auth/v1/health`, {
    method: "GET",
    headers: { apikey: supabaseAnonKey },
    signal: controller.signal,
  })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => clearTimeout(timer));
}

function handleAppStateChange(state: AppStateStatus): void {
  if (!isSupabaseConfigured) return;

  // `inactive` is the notification shade, Face ID, and the app switcher.
  // Only a real background should drop in-flight work.
  if (state === "background") {
    wasBackgrounded = true;
    void supabase.auth.stopAutoRefresh();
    return;
  }

  if (state !== "active") return;

  if (wasBackgrounded) {
    wasBackgrounded = false;
    abortInFlightRequests();
    // Wait until the dead socket is dropped before refreshing the session.
    // Starting that refresh in parallel can stick it on the same socket.
    void drainStaleConnection().finally(() => {
      void supabase.auth.startAutoRefresh();
      for (const listener of resumeListeners) listener();
      void reconnectRealtime();
    });
    return;
  }

  void supabase.auth.startAutoRefresh();
}

if (canUseNativeStorage) {
  AppState.addEventListener("change", handleAppStateChange);
  if (isSupabaseConfigured) {
    handleAppStateChange(AppState.currentState);
  }
}

/** Normalizes the various error shapes Supabase can surface into a message. */
export function toErrorMessage(error: unknown, fallback: string): string {
  const raw =
    error instanceof Error && error.message
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : fallback;

  if (raw.startsWith("AbortError: ")) {
    return raw.slice("AbortError: ".length);
  }

  return raw;
}
