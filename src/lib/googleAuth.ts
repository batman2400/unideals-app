/**
 * Google OAuth for native (Expo).
 *
 * iPhone opens an in-app auth sheet and completes the session from the
 * redirect. Android keeps the system browser, which already returns through
 * `unideals://auth/callback`.
 */
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { getOAuthRedirectUrl, handleAuthDeepLink } from "@/lib/authDeepLink";
import { supabase, toErrorMessage } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

function toGoogleSignInError(caught: unknown, fallback: string): string {
  const message = toErrorMessage(caught, fallback);
  if (/is not a (function|constructor)/i.test(message)) {
    return "Google sign-in couldn't start on this build. Please try again, or use email sign-in.";
  }
  return message;
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    const redirectTo = getOAuthRedirectUrl();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      return {
        error: toGoogleSignInError(
          error,
          "Google sign-in didn't work. Please try again.",
        ),
      };
    }

    if (!data.url) {
      return { error: "Google sign-in didn't start. Please try again." };
    }

    if (Platform.OS === "ios") {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "cancel" || result.type === "dismiss") {
        return { error: null };
      }
      if (result.type !== "success") {
        return { error: "Google sign-in didn't work. Please try again." };
      }
      const exchanged = await handleAuthDeepLink(result.url);
      return { error: exchanged.error };
    }

    await Linking.openURL(data.url);
    return { error: null };
  } catch (caught) {
    return {
      error: toGoogleSignInError(
        caught,
        "Google sign-in didn't work. Please try again.",
      ),
    };
  }
}
