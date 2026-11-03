/**
 * Handles Supabase auth deep links for password recovery and OAuth.
 *
 * Web relies on `detectSessionInUrl`. Native sets that to false, so we parse
 * the URL ourselves and either exchange a PKCE `code` or call `setSession`
 * with hash tokens.
 */
import * as Linking from "expo-linking";

import {
  isConnectionDroppedError,
  supabase,
  toErrorMessage,
  waitForForegroundConnection,
} from "@/lib/supabase";

export interface AuthDeepLinkResult {
  handled: boolean;
  type: string | null;
  error: string | null;
  isRecovery: boolean;
}

/** PKCE codes can only be exchanged once; Linking + AuthSession both fire. */
let lastConsumedCode: string | null = null;
let lastRecoveryUrl: string | null = null;
const inFlightExchanges = new Map<string, Promise<AuthDeepLinkResult>>();

/**
 * The reset link arrives while the app is coming back from Mail. Wait until
 * that resume has dropped the dead socket, and retry once if this resume
 * still cancelled the exchange.
 */
async function whenConnectionReady<T>(run: () => Promise<T>): Promise<T> {
  await waitForForegroundConnection();
  try {
    const result = await run();
    if (!hasConnectionDropped(result)) return result;
  } catch (caught) {
    if (!isConnectionDroppedError(caught)) throw caught;
  }
  await waitForForegroundConnection();
  return run();
}

function hasConnectionDropped(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    isConnectionDroppedError((result as { error: unknown }).error)
  );
}

function parseParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  const pushPair = (raw: string): void => {
    const [rawKey, ...rest] = raw.split("=");
    if (!rawKey) return;
    params[decodeURIComponent(rawKey)] = decodeURIComponent(
      rest.join("=").replace(/\+/g, " "),
    );
  };

  try {
    const parsed = Linking.parse(url);
    if (parsed.queryParams) {
      for (const [key, value] of Object.entries(parsed.queryParams)) {
        if (typeof value === "string") {
          params[key] = value;
        } else if (Array.isArray(value) && typeof value[0] === "string") {
          params[key] = value[0];
        }
      }
    }
  } catch {
    // Fall through to manual parsing.
  }

  const hashIndex = url.indexOf("#");
  if (hashIndex >= 0) {
    url
      .slice(hashIndex + 1)
      .split("&")
      .forEach(pushPair);
  }

  const queryIndex = url.indexOf("?");
  if (queryIndex >= 0) {
    const end = hashIndex >= 0 ? hashIndex : url.length;
    url
      .slice(queryIndex + 1, end)
      .split("&")
      .forEach(pushPair);
  }

  return params;
}

function isRecoveryContext(url: string, type: string | null): boolean {
  if (type === "recovery") return true;
  return /reset-password/i.test(url);
}

export async function handleAuthDeepLink(
  url: string | null | undefined,
): Promise<AuthDeepLinkResult> {
  if (!url) {
    return { handled: false, type: null, error: null, isRecovery: false };
  }

  const params = parseParams(url);
  const type = params.type ?? null;
  const isRecovery = isRecoveryContext(url, type);
  if (isRecovery) lastRecoveryUrl = url;

  if (params.error || params.error_code) {
    return {
      handled: true,
      type,
      isRecovery,
      error:
        params.error_description?.replace(/\+/g, " ") ||
        params.error ||
        (isRecovery
          ? "This reset link is invalid or has expired."
          : "Google sign-in was cancelled or failed."),
    };
  }

  try {
    if (params.code) {
      const code = params.code;
      if (lastConsumedCode === code) {
        return { handled: true, type: null, isRecovery: false, error: null };
      }

      const inFlight = inFlightExchanges.get(code);
      if (inFlight) {
        return inFlight;
      }

      const exchange = (async (): Promise<AuthDeepLinkResult> => {
        try {
          const { error } = await whenConnectionReady(() =>
            supabase.auth.exchangeCodeForSession(code),
          );
          if (error) {
            const { data: existing } = await supabase.auth.getSession();
            if (existing.session) {
              lastConsumedCode = code;
              return { handled: true, type, isRecovery, error: null };
            }
            return {
              handled: true,
              type,
              isRecovery,
              error: toErrorMessage(
                error,
                "Could not complete sign-in from link.",
              ),
            };
          }

          lastConsumedCode = code;
          return { handled: true, type, isRecovery, error: null };
        } catch (caught) {
          return {
            handled: true,
            type,
            isRecovery,
            error: toErrorMessage(
              caught,
              "Could not process authentication link.",
            ),
          };
        } finally {
          inFlightExchanges.delete(code);
        }
      })();

      inFlightExchanges.set(code, exchange);
      return exchange;
    }

    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;
    if (accessToken && refreshToken) {
      const { error } = await whenConnectionReady(() =>
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      );

      if (error) {
        return {
          handled: true,
          type,
          isRecovery,
          error: toErrorMessage(error, "Could not restore session from link."),
        };
      }

      return {
        handled: true,
        type,
        isRecovery,
        error: null,
      };
    }
  } catch (caught) {
    return {
      handled: true,
      type,
      isRecovery,
      error: toErrorMessage(caught, "Could not process authentication link."),
    };
  }

  return { handled: false, type, error: null, isRecovery };
}

/** Runs the last reset link again after "Your connection dropped." */
export function retryLastAuthDeepLink(): Promise<AuthDeepLinkResult> {
  return handleAuthDeepLink(lastRecoveryUrl);
}

/** Canonical redirect target for password-reset emails. */
export function getPasswordResetRedirectUrl(): string {
  return Linking.createURL("reset-password");
}

/** Canonical redirect target for Google (and other OAuth) providers. */
export function getOAuthRedirectUrl(): string {
  return Linking.createURL("auth/callback");
}
