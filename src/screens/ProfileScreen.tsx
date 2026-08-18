import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import {
  BadgeCheck,
  Bookmark,
  CircleHelp,
  FileText,
  LogOut,
  Mail,
  Pencil,
  Shield,
  ShieldQuestion,
  Store,
} from "lucide-react-native";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsGroup } from "@/components/SettingsGroup";
import { StudentIdCard } from "@/components/StudentIdCard";
import { VerificationPanel } from "@/components/VerificationPanel";
import { useAuth } from "@/context/AuthContext";
import { useStudentVerificationRequest } from "@/lib/useVerificationRequest";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import { STUDENT_PASS_URI_PREFIX, type UserRole } from "@/types/database";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Verified Student",
  partner: "Verified Brand",
  admin: "Verified Admin",
};

export interface ProfileScreenProps {
  /**
   * Optional content rendered after the identity block and before Sign out.
   * When omitted, the student ID card + VerificationPanel are shown.
   * Partner/Admin pass their Open Portal card here instead.
   */
  extraSections?: ReactNode;
}

export function ProfileScreen({ extraSections }: ProfileScreenProps) {
  const { user, role, isVerified, metadata, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [verificationFormOpen, setVerificationFormOpen] = useState(false);

  const isTrusted = isVerified || role === "partner" || role === "admin";
  const fullName =
    metadata.full_name?.trim() || metadata.name?.trim() || "Uni Deals member";
  const avatarUrl = metadata.avatar_url || metadata.picture;
  const isSchoolStudent = metadata.student_type === "school";
  const showDefaultStudentSections = extraSections === undefined;
  const showVerification =
    showDefaultStudentSections &&
    role === "student" &&
    !isVerified &&
    !isTrusted;

  const { request, error: verificationError, refresh: refreshVerification, isInFlight } =
    useStudentVerificationRequest(user?.id, showVerification);

  const passPayload = useMemo(
    () => (user ? `${STUDENT_PASS_URI_PREFIX}${user.id}` : ""),
    [user],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign out", "You will need to sign in again to see your deals.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          setIsSigningOut(true);
          void signOut().then((result) => {
            setIsSigningOut(false);
            if (result.error) {
              Alert.alert("Could not sign out", result.error);
            }
          });
        },
      },
    ]);
  }, [signOut]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg },
      ]}
    >
      {showDefaultStudentSections ? (
        <StudentIdCard
          fullName={fullName}
          avatarUrl={avatarUrl}
          institution={metadata.institution}
          isSchoolStudent={isSchoolStudent}
          grade={metadata.grade}
          batch={metadata.batch}
          department={metadata.department}
          qrPayload={passPayload}
          status={isVerified ? "verified" : isInFlight ? "pending" : "unverified"}
          onUnverifiedPress={
            showVerification ? () => setVerificationFormOpen(true) : undefined
          }
        />
      ) : (
        <View style={styles.identityRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => router.push("/edit-profile" as Href)}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>

          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName}
            </Text>
            <View style={styles.emailRow}>
              <Mail color={colors.onSurfaceVariant} size={13} />
              <Text style={styles.email} numberOfLines={1}>
                {user?.email ?? "—"}
              </Text>
            </View>

            {isTrusted ? (
              <View style={[styles.statusPill, styles.statusPillVerified]}>
                <BadgeCheck color={colors.primary} size={13} />
                <Text style={styles.statusPillVerifiedText}>
                  {role ? ROLE_LABEL[role] : "Verified"}
                </Text>
              </View>
            ) : (
              <View style={[styles.statusPill, styles.statusPillPending]}>
                <ShieldQuestion color={colors.warning} size={13} />
                <Text style={styles.statusPillPendingText}>Unverified</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {showDefaultStudentSections ? (
        showVerification ? (
          <>
            {verificationError ? (
              <View style={styles.verifyError}>
                <Text style={styles.verifyErrorText}>{verificationError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refreshVerification()}
                  style={styles.verifyRetry}
                >
                  <Text style={styles.verifyRetryLabel}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
            <VerificationPanel
              isSchoolStudent={isSchoolStudent}
              requestStatus={request?.status ?? null}
              rejectReason={request?.rejectReason ?? null}
              formOpen={verificationFormOpen}
              onFormOpenChange={setVerificationFormOpen}
              onRequestChange={() => void refreshVerification()}
            />
          </>
        ) : null
      ) : (
        extraSections
      )}

      <SettingsGroup
        title="Account"
        rows={[
          {
            key: "edit-profile",
            label: "Edit profile",
            subtitle:
              role === "student"
                ? "Name, photo, and academic details"
                : "Name and photo",
            icon: <Pencil color={colors.primary} size={18} />,
            onPress: () => router.push("/edit-profile" as Href),
          },
          ...(role === "partner"
            ? [
                {
                  key: "brand-profile",
                  label: "Brand profile",
                  subtitle: "Name, logo, and public details",
                  icon: <Store color={colors.primary} size={18} />,
                  onPress: () => router.push("/partner/brand" as Href),
                },
              ]
            : []),
          {
            key: "saved",
            label: "Saved Deals",
            subtitle: "Offers you’ve bookmarked",
            icon: <Bookmark color={colors.primary} size={18} />,
            onPress: () => router.push("/saved" as Href),
          },
        ]}
      />

      <SettingsGroup
        title="Support"
        rows={[
          {
            key: "help",
            label: "Help",
            subtitle: "FAQs and how to get in touch",
            icon: <CircleHelp color={colors.primary} size={18} />,
            onPress: () => router.push("/help" as Href),
          },
          {
            key: "contact",
            label: "Contact",
            subtitle: "Send a message to the Uni Deals team",
            icon: <Mail color={colors.primary} size={18} />,
            onPress: () => router.push("/contact" as Href),
          },
          {
            key: "terms",
            label: "Terms of Service",
            subtitle: "Rules for using Uni Deals",
            icon: <FileText color={colors.primary} size={18} />,
            onPress: () => router.push("/terms" as Href),
          },
          {
            key: "privacy",
            label: "Privacy Policy",
            subtitle: "How we handle your data",
            icon: <Shield color={colors.primary} size={18} />,
            onPress: () => router.push("/privacy" as Href),
          },
        ]}
      />

      <Pressable
        accessibilityRole="button"
        disabled={isSigningOut}
        onPress={handleSignOut}
        style={({ pressed }) => [
          styles.signOut,
          pressed && styles.signOutPressed,
          isSigningOut && styles.signOutDisabled,
        ]}
      >
        <LogOut color={colors.error} size={18} />
        <Text style={styles.signOutLabel}>
          {isSigningOut ? "Signing out…" : "Sign out"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  identityText: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.onBackground,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  email: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusPillVerified: {
    backgroundColor: colors.primaryContainer,
  },
  statusPillVerifiedText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  statusPillPending: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  statusPillPendingText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.warning,
  },
  verifyError: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.errorContainer,
  },
  verifyErrorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onErrorContainer,
  },
  verifyRetry: {
    alignSelf: "flex-start",
    minHeight: MIN_TAP_TARGET,
    justifyContent: "center",
  },
  verifyRetryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onErrorContainer,
  },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: MIN_TAP_TARGET,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.errorContainer,
    backgroundColor: colors.surfaceContainerLowest,
  },
  signOutPressed: {
    opacity: 0.85,
  },
  signOutDisabled: {
    opacity: 0.6,
  },
  signOutLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.error,
  },
});
