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

export async function signInWithGoogle(): Promise<{ error: string | null }> {
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
      error: toErrorMessage(error, "Google sign-in didn't work. Please try again."),
    };
  }

  if (!data.url) {
    return { error: "Google sign-in didn't start. Please try again." };
  }

  await Linking.openURL(data.url);
  return { error: null };
}
