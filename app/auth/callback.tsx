import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { colors, spacing } from "@/theme";

const FALLBACK_MS = 15000;

/**
 * Landing screen for `unideals://auth/callback` (Google OAuth).
 * The root layout exchanges the PKCE code; once a session exists we leave.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isPasswordRecovery } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isPasswordRecovery) {
      router.replace("/reset-password");
      return;
    }

    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, isPasswordRecovery, router]);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    const timeoutId = setTimeout(() => {
      router.replace({
        pathname: "/login",
        params: {
          error:
            "Sign-in didn't finish. Please try again from the login screen.",
        },
      });
    }, FALLBACK_MS);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, isLoading, router]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.label}>Finishing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
});
