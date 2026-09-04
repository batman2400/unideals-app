import { Eye, EyeOff, Lock, Mail, User } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import {
  AuthDivider,
  GoogleSignInButton,
} from "@/components/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";
import {
  PASSWORD_HINT,
  validatePasswordStrength,
} from "@/lib/passwordPolicy";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

type Tab = "signin" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ error?: string }>();

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = tab === "signup";
  const isBusy = isSubmitting || isGoogleSubmitting;

  useEffect(() => {
    if (typeof params.error === "string" && params.error) {
      setError(params.error);
    }
  }, [params.error]);

  const canSubmit = useMemo(() => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      return false;
    }
    if (isSignUp) {
      if (validatePasswordStrength(password)) return false;
      return fullName.trim().length > 1 && username.trim().length > 1;
    }
    return password.length >= 8;
  }, [email, password, fullName, username, isSignUp]);

  const switchTab = useCallback((next: Tab) => {
    setTab(next);
    setError(null);
    setNotice(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isBusy) return;

    if (isSignUp) {
      const strengthError = validatePasswordStrength(password);
      if (strengthError) {
        setError(strengthError);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const result = isSignUp
        ? await signUp(email, password, { fullName, username })
        : await signIn(email, password);

      if (result.error) {
        setError(result.error);
      } else if (isSignUp) {
        setNotice(
          "Account created. Check your inbox to confirm your email, then sign in.",
        );
        setTab("signin");
        setPassword("");
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    isBusy,
    isSignUp,
    signUp,
    signIn,
    email,
    password,
    fullName,
    username,
  ]);

  const handleForgotPassword = useCallback(async () => {
    if (isBusy) return;
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter your email address first, then tap Forgot password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await resetPassword(email);

      if (result.error) {
        setError(result.error);
      } else {
        setNotice("Password reset link sent. Check your email.");
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to send reset email.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isBusy, resetPassword]);

  const handleGoogleSignIn = useCallback(async () => {
    if (isBusy) return;

    setIsGoogleSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Google sign-in didn't work. Please try again.",
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [isBusy, signInWithGoogle]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <Image
            accessibilityLabel="Uni Deals logo"
            source={require("../../assets/logo.png")}
            style={styles.logoMark}
          />
          <Text style={styles.wordmark}>
            Uni<Text style={styles.wordmarkAccent}>Deals</Text>
          </Text>
          <Text style={styles.tagline}>
            Student discounts, verified and ready to use.
          </Text>
        </View>

        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: !isSignUp }}
            onPress={() => switchTab("signin")}
            style={[styles.tab, !isSignUp && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, !isSignUp && styles.tabLabelActive]}>
              Sign in
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSignUp }}
            onPress={() => switchTab("signup")}
            style={[styles.tab, isSignUp && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, isSignUp && styles.tabLabelActive]}>
              Create account
            </Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <GoogleSignInButton
            onPress={() => void handleGoogleSignIn()}
            loading={isGoogleSubmitting}
            disabled={isBusy}
          />
          <AuthDivider />

          {isSignUp ? (
            <>
              <Field
                icon={<User color={colors.onSurfaceVariant} size={18} />}
                placeholder="Full name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                textContentType="name"
              />
              <Field
                icon={<User color={colors.onSurfaceVariant} size={18} />}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                textContentType="username"
              />
            </>
          ) : null}

          <Field
            icon={<Mail color={colors.onSurfaceVariant} size={18} />}
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <Field
            icon={<Lock color={colors.onSurfaceVariant} size={18} />}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            secureTextEntry={!showPassword}
            textContentType={isSignUp ? "newPassword" : "password"}
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                hitSlop={12}
                onPress={() => setShowPassword((previous) => !previous)}
              >
                {showPassword ? (
                  <EyeOff color={colors.onSurfaceVariant} size={18} />
                ) : (
                  <Eye color={colors.onSurfaceVariant} size={18} />
                )}
              </Pressable>
            }
          />

          {isSignUp ? (
            <Text style={styles.disclaimer}>{PASSWORD_HINT}</Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Button
            label={isSignUp ? "Create account" : "Sign in"}
            onPress={() => void handleSubmit()}
            disabled={!canSubmit || isBusy}
            loading={isSubmitting}
            style={styles.submit}
          />

          {!isSignUp ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleForgotPassword()}
              style={styles.forgot}
            >
              <Text style={styles.forgotLabel}>Forgot password?</Text>
            </Pressable>
          ) : (
            <Text style={styles.disclaimer}>
              After you sign up, verify from Profile with a university email OTP
              for instant access, or upload a student ID for review. Verification
              is valid for 12 months.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  autoComplete?: "email" | "username" | "password" | "off";
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
  textContentType?: "name" | "username" | "emailAddress" | "password" | "newPassword";
  trailing?: React.ReactNode;
}

function Field({
  icon,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = "none",
  autoComplete,
  keyboardType = "default",
  secureTextEntry = false,
  textContentType,
  trailing,
}: FieldProps) {
  return (
    <View style={styles.field}>
      {icon}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.inverseOnSurface}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        textContentType={textContentType}
      />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  brandBlock: {
    alignItems: "center",
    gap: spacing.sm,
  },
  logoMark: {
    width: 48,
    height: 48,
  },
  wordmark: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1.2,
    color: colors.onBackground,
  },
  wordmarkAccent: {
    color: colors.primary,
  },
  tagline: {
    fontSize: 14,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  tabs: {
    flexDirection: "row",
    padding: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainer,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TAP_TARGET - 8,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  form: {
    gap: spacing.md,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: MIN_TAP_TARGET + 6,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: spacing.md,
  },
  error: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  notice: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  submit: {
    marginTop: spacing.xs,
  },
  forgot: {
    alignSelf: "center",
    minHeight: MIN_TAP_TARGET,
    justifyContent: "center",
  },
  forgotLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
});
