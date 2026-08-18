import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeCheck, ShieldQuestion } from "lucide-react-native";
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { colors, radius, spacing } from "@/theme";

export type StudentIdStatus = "verified" | "pending" | "unverified" | "expired";

export interface StudentIdCardProps {
  fullName: string;
  avatarUrl?: string | null;
  institution?: string;
  isSchoolStudent: boolean;
  grade?: string;
  batch?: string;
  department?: string;
  qrPayload: string;
  status: StudentIdStatus;
  /** Formatted yearly expiry, e.g. "18 Aug 2027". */
  expiresAtLabel?: string | null;
  onUnverifiedPress?: () => void;
}

const STATUS_LABEL: Record<StudentIdStatus, string> = {
  verified: "Verified",
  pending: "Pending",
  unverified: "Unverified",
  expired: "Expired",
};

export function StudentIdCard({
  fullName,
  avatarUrl,
  institution,
  isSchoolStudent,
  grade,
  batch,
  department,
  qrPayload,
  status,
  expiresAtLabel,
  onUnverifiedPress,
}: StudentIdCardProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const flipping = useRef(false);
  const showingBackRef = useRef(false);
  const [showingBack, setShowingBack] = useState(false);

  const secondaryLine = isSchoolStudent
    ? displayValue(grade)
    : [displayValue(batch, true), displayValue(department, true)]
        .filter(Boolean)
        .join(" · ") || "Not set";

  const needsVerification =
    (status === "unverified" || status === "expired") && Boolean(onUnverifiedPress);

  const flip = useCallback(() => {
    if (needsVerification && onUnverifiedPress) {
      onUnverifiedPress();
      return;
    }
    if (flipping.current) return;
    flipping.current = true;
    const next = !showingBackRef.current;
    showingBackRef.current = next;
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 420,
      useNativeDriver: true,
    }).start(() => {
      flipping.current = false;
      setShowingBack(next);
    });
  }, [needsVerification, onUnverifiedPress, progress]);

  const frontRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const frontOpacity = progress.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = progress.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const canShowQr = status === "verified" && qrPayload.length > 0;

  const frontHint =
    status === "expired"
      ? "Tap to re-verify for this year"
      : needsVerification
        ? "Tap to get verified"
        : expiresAtLabel
          ? `Valid until ${expiresAtLabel} · Tap to show code`
          : "Tap to show code";

  const backHint = canShowQr
    ? expiresAtLabel
      ? `Valid until ${expiresAtLabel}. Deals use a timed ticket. Tap to flip back.`
      : "Deals use a timed ticket. Tap to flip back."
    : "Verify to activate your pass";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        needsVerification
          ? status === "expired"
            ? "Re-verify student status"
            : "Get verified"
          : showingBack
            ? "Hide student code"
            : "Show student code"
      }
      accessibilityState={{ selected: showingBack }}
      onPress={flip}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <View style={styles.stage}>
        <Animated.View
          pointerEvents={showingBack ? "none" : "auto"}
          style={[
            styles.face,
            {
              opacity: frontOpacity,
              transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
            },
          ]}
        >
          <CardShell>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.kicker}>Student ID</Text>
                <Text style={styles.brand}>
                  Uni<Text style={styles.brandAccent}>Deals</Text>
                </Text>
              </View>
              <StatusChip status={status} />
            </View>

            <View style={styles.bodyRow}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.photo}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.photo, styles.photoFallback]}>
                  <Text style={styles.photoInitial}>
                    {fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.details}>
                <Text style={styles.name} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={styles.institution} numberOfLines={2}>
                  {displayValue(institution)}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {isSchoolStudent ? "Grade / Level" : "Batch · Department"}
                </Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {secondaryLine}
                </Text>
              </View>
            </View>

            <Text style={styles.hint}>{frontHint}</Text>
          </CardShell>
        </Animated.View>

        <Animated.View
          pointerEvents={showingBack ? "auto" : "none"}
          style={[
            styles.face,
            {
              opacity: backOpacity,
              transform: [{ perspective: 1200 }, { rotateY: backRotate }],
            },
          ]}
        >
          <CardShell>
            <View style={styles.topRow}>
              <Text style={styles.kicker}>Student ID</Text>
              <StatusChip status={status} />
            </View>

            <View style={styles.qrWrap}>
              {canShowQr ? (
                <View style={styles.qrPlate}>
                  <QRCode
                    value={qrPayload}
                    size={112}
                    color={colors.primary}
                    backgroundColor={colors.white}
                    ecl="H"
                  />
                </View>
              ) : (
                <View style={[styles.qrPlate, styles.qrLocked]}>
                  <ShieldQuestion color={colors.onSurfaceVariant} size={28} />
                  <Text style={styles.qrLockedText}>
                    {status === "expired"
                      ? "Re-verify to activate your pass"
                      : "Verify to activate your pass"}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.hint}>{backHint}</Text>
          </CardShell>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <LinearGradient
      colors={[colors.primary, colors.onPrimaryFixed]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      <LinearGradient
        colors={["rgba(255,255,255,0.14)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.55 }}
        style={styles.sheen}
        pointerEvents="none"
      />
      {children}
    </LinearGradient>
  );
}

function StatusChip({ status }: { status: StudentIdStatus }) {
  const verified = status === "verified";
  return (
    <View
      style={[styles.chip, verified ? styles.chipVerified : styles.chipMuted]}
    >
      {verified ? (
        <BadgeCheck color={colors.onPrimaryContainer} size={12} />
      ) : (
        <ShieldQuestion color={colors.onPrimary} size={12} />
      )}
      <Text
        style={[
          styles.chipText,
          verified ? styles.chipTextVerified : styles.chipTextMuted,
        ]}
      >
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

function displayValue(value?: string, emptyAsBlank = false): string {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return emptyAsBlank ? "" : "Not set";
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },
  pressed: {
    opacity: 0.96,
  },
  stage: {
    width: "100%",
    aspectRatio: 1.62,
    minHeight: 208,
  },
  face: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backfaceVisibility: "hidden",
  },
  shell: {
    flex: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  sheen: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.primaryContainer,
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.onPrimary,
  },
  brandAccent: {
    color: colors.primaryContainer,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipVerified: {
    backgroundColor: colors.primaryContainer,
  },
  chipMuted: {
    backgroundColor: "rgba(222, 255, 244, 0.16)",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  chipTextVerified: {
    color: colors.onPrimaryContainer,
  },
  chipTextMuted: {
    color: colors.onPrimary,
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  photo: {
    width: 72,
    height: 92,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.onPrimary,
  },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  photoInitial: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.onPrimary,
  },
  institution: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryContainer,
    marginBottom: 6,
  },
  meta: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.primaryContainer,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onPrimary,
  },
  hint: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primaryContainer,
  },
  qrWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlate: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  qrLocked: {
    width: 148,
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  qrLockedText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
});
