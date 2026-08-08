/**
 * Handles Supabase auth deep links for password recovery (and similar).
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

export async function handleAuthDeepLink(
  url: string | null | undefined,
): Promise<AuthDeepLinkResult> {
  if (!url) {
    return { handled: false, type: null, error: null };
  }

  const params = parseParams(url);

  if (params.error || params.error_code) {
    return {
      handled: true,
      type: params.type ?? null,
      error:
        params.error_description?.replace(/\+/g, " ") ||
        params.error ||
        "This reset link is invalid or has expired.",
    };
  }

  try {
    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) {
        return {
          handled: true,
          type: params.type ?? null,
          error: toErrorMessage(error, "Could not complete sign-in from link."),
        };
      }

      return {
        handled: true,
        type: params.type ?? "recovery",
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
          type: params.type ?? null,
          error: toErrorMessage(error, "Could not restore session from link."),
        };
      }

      return {
        handled: true,
        type: params.type ?? "recovery",
        error: null,
      };
    }
  } catch (caught) {
    return {
      handled: true,
      type: params.type ?? null,
      error: toErrorMessage(caught, "Could not process authentication link."),
    };
  }

  return { handled: false, type: null, error: null };
}

/** Canonical redirect target for password-reset emails. */
export function getPasswordResetRedirectUrl(): string {
  return Linking.createURL("reset-password");
}
