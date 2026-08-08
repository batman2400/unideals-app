import { Image } from "expo-image";
import {
  BadgeCheck,
  GraduationCap,
  LogOut,
  Mail,
  ShieldQuestion,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VerificationPanel } from "@/components/VerificationPanel";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import { STUDENT_PASS_URI_PREFIX, type UserRole } from "@/types/database";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Verified Student",
  partner: "Verified Brand",
  admin: "Verified Admin",
};

export default function ProfileScreen() {
  const { user, role, isVerified, metadata, signOut, refreshRole } = useAuth();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasPendingVerification, setHasPendingVerification] = useState(false);

  const isTrusted = isVerified || role === "partner" || role === "admin";
  const fullName = metadata.full_name?.trim() || "Uni Deals member";
  const isSchoolStudent = metadata.student_type === "school";
  const showVerification =
    role === "student" && !isVerified && !isTrusted;

  const passPayload = useMemo(
    () => (user ? `${STUDENT_PASS_URI_PREFIX}${user.id}` : ""),
    [user],
  );

  useEffect(() => {
    if (!user || !showVerification) return;

    void (async () => {
      const { data } = await supabase
        .from("manual_verifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .limit(1);

      setHasPendingVerification((data?.length ?? 0) > 0);
    })();
  }, [user, showVerification, refreshRole]);

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
      <View style={styles.identityRow}>
        {metadata.avatar_url ? (
          <Image
            source={{ uri: metadata.avatar_url }}
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
          ) : hasPendingVerification ? (
            <View style={[styles.statusPill, styles.statusPillPending]}>
              <ShieldQuestion color={colors.warning} size={13} />
              <Text style={styles.statusPillPendingText}>
                Verification pending
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

      <View style={styles.pass}>
        <View style={styles.passHeader}>
          <View>
            <Text style={styles.passLabel}>Digital Student Pass</Text>
            <Text style={styles.passBrand}>
              Uni<Text style={styles.passBrandAccent}>Deals</Text>
            </Text>
          </View>
          <GraduationCap color={colors.onPrimary} size={26} />
        </View>

        <View style={styles.passQrWrap}>
          {isTrusted && passPayload ? (
            <View style={styles.passQr}>
              <QRCode
                value={passPayload}
                size={132}
                color={colors.primary}
                backgroundColor={colors.white}
                ecl="H"
              />
            </View>
          ) : (
            <View style={[styles.passQr, styles.passQrLocked]}>
              <ShieldQuestion color={colors.onSurfaceVariant} size={32} />
              <Text style={styles.passQrLockedText}>
                Verify to activate your pass
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.passHint}>
          This pass identifies you as a verified student. In-store deal
          redemptions use a separate timed ticket from each deal page.
        </Text>

        <View style={styles.passDetails}>
          <PassField
            label={isSchoolStudent ? "School" : "Institution"}
            value={metadata.institution}
          />
          <PassField
            label={isSchoolStudent ? "Grade / Level" : "Batch / Intake"}
            value={isSchoolStudent ? metadata.grade : metadata.batch}
          />
          {!isSchoolStudent ? (
            <PassField
              label="Faculty / Department"
              value={metadata.department}
            />
          ) : null}
        </View>
      </View>

      {showVerification ? (
        <VerificationPanel
          hasPendingVerification={hasPendingVerification}
          onPendingChange={setHasPendingVerification}
        />
      ) : null}

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

function PassField({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.passField}>
      <Text style={styles.passFieldLabel}>{label}</Text>
      <Text style={styles.passFieldValue} numberOfLines={1}>
        {value?.trim() || "Not set"}
      </Text>
    </View>
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
  pass: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.primary,
  },
  passHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  passLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.primaryContainer,
  },
  passBrand: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.onPrimary,
  },
  passBrandAccent: {
    color: colors.primaryContainer,
  },
  passQrWrap: {
    alignItems: "center",
  },
  passQr: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  passQrLocked: {
    width: 156,
    height: 156,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  passQrLockedText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  passHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.primaryContainer,
  },
  passDetails: {
    gap: spacing.md,
  },
  passField: {
    gap: 2,
  },
  passFieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.primaryContainer,
  },
  passFieldValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onPrimary,
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
