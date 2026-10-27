/**
 * Native Sign in with Apple.
 *
 * Apple receives a SHA-256 hash of the nonce. Supabase receives the raw nonce
 * and checks it against the identity token. The name is only present on the
 * first authorization, so it is saved immediately.
 */
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

import { supabase, toErrorMessage } from "@/lib/supabase";

function randomNonce(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function appleDisplayName(
  name: AppleAuthentication.AppleAuthenticationFullName | null,
): string {
  if (!name) return "";
  return [name.givenName, name.familyName]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<{ error: string | null }> {
  try {
    const rawNonce = randomNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { error: "Apple sign-in didn't return a token. Please try again." };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      return {
        error: toErrorMessage(error, "Apple sign-in didn't work. Please try again."),
      };
    }

    const fullName = appleDisplayName(credential.fullName);
    if (fullName) {
      await supabase.auth.updateUser({ data: { full_name: fullName } });
    }

    return { error: null };
  } catch (caught) {
    if (
      caught instanceof Error &&
      "code" in caught &&
      caught.code === "ERR_REQUEST_CANCELED"
    ) {
      return { error: null };
    }

    return {
      error: toErrorMessage(caught, "Apple sign-in didn't work. Please try again."),
    };
  }
}
