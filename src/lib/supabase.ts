/**
 * Supabase Client (React Native)
 *
 * Port of the web app's `src/lib/supabaseClient.js`. Two things differ on
 * mobile:
 *
 *  1. Sessions persist through `@react-native-async-storage/async-storage`
 *     instead of `localStorage`.
 *  2. Token auto-refresh is tied to app foreground state, because timers are
 *     throttled or suspended while the app is backgrounded.
 *
 * Environment variables map 1:1 to the web app's `.env.local`:
 *   VITE_SUPABASE_URL      -> EXPO_PUBLIC_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY -> EXPO_PUBLIC_SUPABASE_ANON_KEY
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState, type AppStateStatus } from "react-native";

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

if (!isSupabaseConfigured) {
  console.error(
    "[supabase] Missing environment variables. Ensure EXPO_PUBLIC_SUPABASE_URL " +
      "and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in unideals-app/.env",
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // There is no URL fragment to parse in a native runtime; deep-linked
      // auth callbacks are handled explicitly instead.
      detectSessionInUrl: false,
    },
  },
);

function handleAppStateChange(state: AppStateStatus): void {
  if (!isSupabaseConfigured) return;

  if (state === "active") {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
}

AppState.addEventListener("change", handleAppStateChange);
if (isSupabaseConfigured) {
  handleAppStateChange(AppState.currentState);
}

/** Normalizes the various error shapes Supabase can surface into a message. */
export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}
