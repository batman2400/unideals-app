/**
 * Google OAuth for native (Expo).
 *
 * Opens the system browser. Supabase redirects back to
 * `unideals://auth/callback`, which the root layout exchanges the same way
 * as password-reset links. Avoid `expo-web-browser` here — it is a native
 * module and crashes development builds that were compiled without it.
 */
import * as Linking from "expo-linking";

import { getOAuthRedirectUrl } from "@/lib/authDeepLink";
import { supabase, toErrorMessage } from "@/lib/supabase";

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
