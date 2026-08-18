import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { Check, X } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SegmentedControl } from "@/components/SegmentedControl";
import {
  type VerificationProofUrls,
  useAdminVerifications,
} from "@/lib/useAdmin";
import {
  VERIFICATION_REJECT_REASONS,
  formatVerificationRejectReason,
  type VerificationRejectReasonId,
} from "@/lib/verificationRejectReasons";
import { colors, radius, spacing } from "@/theme";
import type { ManualVerification } from "@/types/database";

type VerificationQueue = "email_otp" | "manual";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function inQueue(item: ManualVerification, queue: VerificationQueue): boolean {
  if (queue === "email_otp") {
    return item.method === "email_otp" && item.status === "awaiting_confirmation";
  }
  return item.method !== "email_otp" && item.status === "pending";
}

function ProofThumb({
  uri,
  label,
}: {
  uri: string | null;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${label}`}
      disabled={!uri}
      onPress={() => {
        if (uri) void Linking.openURL(uri);
      }}
      style={styles.proofWrap}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.proofImage} contentFit="cover" />
      ) : (
        <View style={styles.proofPlaceholder}>
          <Text style={styles.proofPlaceholderText}>{label} unavailable</Text>
        </View>
      )}
      <Text style={styles.proofCaption}>{label}</Text>
    </Pressable>
  );
}

function VerificationCard({
  item,
  proofs,
  acting,
  onApprove,
  onReject,
}: {
  item: ManualVerification;
  proofs: VerificationProofUrls | undefined;
  acting: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [preset, setPreset] = useState<VerificationRejectReasonId>("unreadable");
  const [note, setNote] = useState("");

  return (
    <View style={styles.card}>
      <View style={styles.proofRow}>
        <ProofThumb uri={proofs?.front ?? null} label="Front" />
        <ProofThumb uri={proofs?.back ?? null} label="Back" />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardMeta}>
          <Text style={styles.institutionType}>
            {item.method === "email_otp" ? "Email OTP" : item.institutionType}
          </Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.institutionName}>{item.institutionName}</Text>

        {item.courseDetails ? (
          <Text style={styles.detail}>
            <Text style={styles.detailLabel}>
              {item.institutionType === "school" ? "Grade: " : "Course: "}
            </Text>
            {item.courseDetails}
          </Text>
        ) : null}
        {item.studentIdNumber ? (
          <Text style={styles.detail}>
            <Text style={styles.detailLabel}>ID: </Text>
            {item.studentIdNumber}
          </Text>
        ) : null}
        {item.contactEmail ? (
          <Text style={styles.detail}>
            <Text style={styles.detailLabel}>Email: </Text>
            {item.contactEmail}
          </Text>
        ) : null}

        {rejecting ? (
          <View style={styles.rejectPanel}>
            <Text style={styles.rejectHeading}>Reject reason</Text>
            <View style={styles.reasonRow}>
              {VERIFICATION_REJECT_REASONS.map((reason) => (
                <Pressable
                  key={reason.id}
                  onPress={() => setPreset(reason.id)}
                  style={[
                    styles.reasonChip,
                    preset === reason.id && styles.reasonChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonChipLabel,
                      preset === reason.id && styles.reasonChipLabelActive,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.noteInput}
              placeholder={preset === "other" ? "Describe the issue" : "Optional note"}
              placeholderTextColor={colors.inverseOnSurface}
              value={note}
              onChangeText={setNote}
            />
            <View style={styles.actions}>
              <Pressable
                disabled={acting}
                onPress={() => setRejecting(false)}
                style={[styles.actionBtn, styles.cancelBtn]}
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={acting}
                onPress={() =>
                  onReject(formatVerificationRejectReason(preset, note))
                }
                style={[styles.actionBtn, styles.rejectBtn]}
              >
                {acting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.rejectLabel}>Confirm reject</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={acting}
              onPress={onApprove}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.approveBtn,
                (pressed || acting) && styles.pressed,
              ]}
            >
              {acting ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <>
                  <Check color={colors.onPrimary} size={16} />
                  <Text style={styles.approveLabel}>Approve</Text>
                </>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={acting}
              onPress={() => setRejecting(true)}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.rejectBtn,
                (pressed || acting) && styles.pressed,
              ]}
            >
              <X color={colors.white} size={16} />
              <Text style={styles.rejectLabel}>Reject</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export default function AdminVerificationsScreen() {
  const [queue, setQueue] = useState<VerificationQueue>("email_otp");
  const {
    verifications,
    proofUrls,
    isLoading,
    isRefreshing,
    actingId,
    error,
    message,
    refresh,
    approve,
    reject,
  } = useAdminVerifications();

  const emailCount = useMemo(
    () => verifications.filter((item) => inQueue(item, "email_otp")).length,
    [verifications],
  );
  const manualCount = useMemo(
    () => verifications.filter((item) => inQueue(item, "manual")).length,
    [verifications],
  );
  const visible = useMemo(
    () => verifications.filter((item) => inQueue(item, queue)),
    [queue, verifications],
  );

  const confirmApprove = useCallback(
    (item: ManualVerification) => {
      Alert.alert(
        "Approve verification?",
        "Grant this student verified status?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            onPress: () => {
              void approve(item.id);
            },
          },
        ],
      );
    },
    [approve],
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.subtitle}>
              Email OTP is the fast lane after inbox confirmation. Manual
              includes school students and anyone without an institute email.
            </Text>
            <SegmentedControl
              options={[
                {
                  value: "email_otp",
                  label: "Email OTP",
                  count: emailCount,
                },
                {
                  value: "manual",
                  label: "Manual",
                  count: manualCount,
                },
              ]}
              value={queue}
              onChange={setQueue}
            />
            {message ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptyBody}>
                {queue === "email_otp"
                  ? "No university-email requests are waiting for confirmation."
                  : "No manual or school requests are waiting for review."}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <VerificationCard
            item={item}
            proofs={proofUrls[item.id]}
            acting={actingId === item.id}
            onApprove={() => confirmApprove(item)}
            onReject={(reason) => {
              void reject(item.id, reason);
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerBlock: {
    gap: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  successBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
  },
  successText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.errorContainer,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onErrorContainer,
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onBackground,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    overflow: "hidden",
  },
  proofRow: {
    flexDirection: "row",
  },
  proofWrap: {
    flex: 1,
    height: 160,
    backgroundColor: colors.surfaceContainerLow,
  },
  proofImage: {
    width: "100%",
    height: "100%",
  },
  proofPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  proofPlaceholderText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
  proofCaption: {
    position: "absolute",
    left: spacing.sm,
    bottom: spacing.sm,
    fontSize: 11,
    fontWeight: "800",
    color: colors.white,
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  institutionType: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.primary,
  },
  date: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.outline,
    textTransform: "uppercase",
  },
  institutionName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.onBackground,
  },
  detail: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  detailLabel: {
    fontWeight: "800",
    color: colors.onSurface,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  approveBtn: {
    backgroundColor: colors.primary,
  },
  rejectBtn: {
    backgroundColor: colors.error,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  approveLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  rejectLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  cancelLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.onSurface,
  },
  pressed: {
    opacity: 0.75,
  },
  rejectPanel: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rejectHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.onSurface,
  },
  reasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  reasonChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  reasonChipActive: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
  },
  reasonChipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  reasonChipLabelActive: {
    color: colors.onErrorContainer,
  },
  noteInput: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
  },
});
