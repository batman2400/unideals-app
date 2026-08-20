import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import {
  PASSWORD_HINT,
  validatePasswordStrength,
} from "@/lib/passwordPolicy";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

type Status = "checking" | "ready" | "done" | "invalid";

/** Wait for the recovery deep-link exchange before bouncing to login. */
const RECOVERY_WAIT_MS = 8000;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isAuthenticated,
    isLoading,
    isPasswordRecovery,
    clearPasswordRecovery,
    signOut,
  } = useAuth();
  const params = useLocalSearchParams<{ error?: string }>();

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(
    typeof params.error === "string" ? params.error : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof params.error === "string" && params.error) {
      setStatus("invalid");
      setError(params.error);
      return;
    }

    // Stay on the success / error screens until the user chooses a CTA.
    // Clearing recovery while authenticated would otherwise replace("/")
    // before "Password updated" can render.
    if (status === "done") {
      if (isAuthenticated && !isPasswordRecovery) {
        router.replace("/");
      }
      return;
    }

    if (status === "invalid") {
      return;
    }

    if (isLoading) return;

    // Accidental landings (logout fallback / Fast Refresh) must not show
    // the update-password form for a normal session.
    if (isAuthenticated && !isPasswordRecovery) {
      router.replace("/");
      return;
    }

    if (isAuthenticated && isPasswordRecovery) {
      setStatus("ready");
    }
  }, [
    isAuthenticated,
    isLoading,
    isPasswordRecovery,
    params.error,
    router,
    status,
  ]);

  useEffect(() => {
    if (status !== "checking") return;
    if (isLoading || isAuthenticated) return;
    if (typeof params.error === "string" && params.error) return;

    const timer = setTimeout(() => {
      router.replace("/login");
    }, RECOVERY_WAIT_MS);

    return () => clearTimeout(timer);
  }, [status, isLoading, isAuthenticated, params.error, router]);

  // Recovery error + live session: sign out so "(auth)/login" can mount.
  useEffect(() => {
    if (status !== "invalid" || !isAuthenticated || isLoading) return;
    void signOut();
  }, [status, isAuthenticated, isLoading, signOut]);

  const handleSubmit = useCallback(async () => {
    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      setError(strengthError);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(toErrorMessage(updateError, "Could not update password."));
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.signOut({ scope: "others" });
    setStatus("done");
    setIsSubmitting(false);
  }, [password, confirm]);

  const handleGoToDeals = useCallback(() => {
    clearPasswordRecovery();
  }, [clearPasswordRecovery]);

  const handleBackToSignIn = useCallback(async () => {
    if (isAuthenticated) {
      await signOut();
    } else {
      clearPasswordRecovery();
    }
    router.replace("/login");
  }, [isAuthenticated, signOut, clearPasswordRecovery, router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
      >
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>{PASSWORD_HINT}</Text>

        {status === "checking" ? (
          <Text style={styles.notice}>Confirming your reset link…</Text>
        ) : null}

        {status === "invalid" ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <Button label="Back to sign in" onPress={() => void handleBackToSignIn()} />
          </>
        ) : null}

        {status === "done" ? (
          <>
            <Text style={styles.notice}>
              Password updated. You can continue using Uni Deals.
            </Text>
            <Button label="Go to deals" onPress={handleGoToDeals} />
          </>
        ) : null}

        {status === "ready" ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={colors.inverseOnSurface}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              textContentType="newPassword"
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={colors.inverseOnSurface}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              autoCapitalize="none"
              textContentType="newPassword"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              label="Update password"
              loading={isSubmitting}
              onPress={() => void handleSubmit()}
            />
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.onBackground,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  form: {
    gap: spacing.md,
  },
  input: {
    minHeight: MIN_TAP_TARGET + 6,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    fontSize: 15,
    color: colors.onSurface,
  },
  error: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  notice: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
