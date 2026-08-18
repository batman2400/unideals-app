/**
 * Handles Supabase auth deep links for password recovery and OAuth.
 *
 * Web relies on `detectSessionInUrl`. Native sets that to false, so we parse
 * the URL ourselves and either exchange a PKCE `code` or call `setSession`
 * with hash tokens.
 */
import * as Linking from "expo-linking";

import { supabase, toErrorMessage } from "@/lib/supabase";

export interface AuthDeepLinkResult {
  handled: boolean;
  type: string | null;
  error: string | null;
  isRecovery: boolean;
}

/** PKCE codes can only be exchanged once; Linking + AuthSession both fire. */
let lastConsumedCode: string | null = null;

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
      if (lastConsumedCode === params.code) {
        return { handled: true, type, isRecovery, error: null };
      }
      lastConsumedCode = params.code;

      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) {
        return {
          handled: true,
          type,
          isRecovery,
          error: toErrorMessage(error, "Could not complete sign-in from link."),
        };
      }

      return {
        handled: true,
        type,
        isRecovery,
        error: null,
      };
    }

    if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });

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

/** Canonical redirect target for password-reset emails. */
export function getPasswordResetRedirectUrl(): string {
  return Linking.createURL("reset-password");
}

/** Canonical redirect target for Google (and other OAuth) providers. */
export function getOAuthRedirectUrl(): string {
  return Linking.createURL("auth/callback");
}
