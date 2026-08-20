import { Image } from "expo-image";
import { CalendarDays, Check, MapPin, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { useAdminPendingEvents } from "@/lib/useAdmin";
import { colors, radius, spacing } from "@/theme";
import type { CampusEvent } from "@/types/database";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function promptRejectReason(): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Reject event?",
        "Optional reason (leave blank to reject without one).",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
          {
            text: "Reject",
            style: "destructive",
            onPress: (text?: string) => resolve(text ?? ""),
          },
        ],
        "plain-text",
      );
      return;
    }

    Alert.alert("Reject event?", "Reject this event submission?", [
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => resolve(""),
      },
    ]);
  });
}

function PendingEventCard({
  event,
  acting,
  onApprove,
  onReject,
}: {
  event: CampusEvent;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const publishAt = event.publishAt ? new Date(event.publishAt) : null;
  const isScheduled =
    publishAt != null &&
    !Number.isNaN(publishAt.getTime()) &&
    publishAt > new Date();

  return (
    <View style={styles.card}>
      <View style={styles.cover}>
        {event.coverImageUrl ? (
          <Image
            source={{ uri: event.coverImageUrl }}
            style={styles.coverImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <CalendarDays color={colors.primary} size={36} />
            <Text style={styles.coverPlaceholderText}>No cover image</Text>
          </View>
        )}
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>Pending Review</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.tags}>
          <View style={styles.tagPrimary}>
            <Text style={styles.tagPrimaryText}>
              {event.category || "Uncategorized"}
            </Text>
          </View>
          <View style={styles.tagMuted}>
            <Text style={styles.tagMutedText}>
              {(event.targetAudience || "all_students").replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{event.title}</Text>

        {event.universityName || event.clubName ? (
          <Text style={styles.school} numberOfLines={1}>
            {[event.universityName, event.clubName].filter(Boolean).join(" · ")}
          </Text>
        ) : null}

        <Text style={styles.when}>{formatWhen(event.startTime)}</Text>
        {event.publishAt ? (
          <Text style={styles.goLive}>
            Go-live: {formatWhen(event.publishAt)}
            {isScheduled ? " (Coming Soon)" : ""}
          </Text>
        ) : null}
        {event.locationName ? (
          <View style={styles.locationRow}>
            <MapPin color={colors.onSurfaceVariant} size={14} />
            <Text style={styles.location} numberOfLines={1}>
              {event.locationName}
            </Text>
          </View>
        ) : null}

        {event.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}

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
            onPress={onReject}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.rejectBtn,
              (pressed || acting) && styles.pressed,
            ]}
          >
            {acting ? (
              <ActivityIndicator color={colors.error} size="small" />
            ) : (
              <>
                <X color={colors.error} size={16} />
                <Text style={styles.rejectLabel}>Reject</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function AdminPendingEventsScreen() {
  const {
    events,
    isLoading,
    isRefreshing,
    actingId,
    error,
    message,
    refresh,
    approve,
    reject,
  } = useAdminPendingEvents();
  const [rejectTarget, setRejectTarget] = useState<CampusEvent | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const confirmAndroidReject = () => {
    if (!rejectTarget) return;
    const id = rejectTarget.id;
    const reason = rejectReason.trim();
    setRejectTarget(null);
    setRejectReason("");
    void reject(id, reason);
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={events}
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
              Review user-submitted events before they go live.
              {events.length > 0 ? ` (${events.length})` : ""}
            </Text>
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
              <Text style={styles.emptyTitle}>Queue is clear</Text>
              <Text style={styles.emptyBody}>
                No events need moderation right now.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const publishAt = item.publishAt ? new Date(item.publishAt) : null;
          const isScheduled =
            publishAt != null &&
            !Number.isNaN(publishAt.getTime()) &&
            publishAt > new Date();

          return (
            <PendingEventCard
              event={item}
              acting={actingId === item.id}
              onApprove={() => {
                Alert.alert(
                  "Approve event?",
                  isScheduled
                    ? `Students will see it as Coming Soon until ${publishAt?.toLocaleString()}.`
                    : "It will go live on the public feed immediately.",
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
              }}
              onReject={() => {
                if (Platform.OS === "ios") {
                  void (async () => {
                    const reason = await promptRejectReason();
                    if (reason === null) return;
                    await reject(item.id, reason);
                  })();
                  return;
                }
                setRejectTarget(item);
                setRejectReason("");
              }}
            />
          );
        }}
      />

      <Modal
        visible={rejectTarget != null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectTarget(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setRejectTarget(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Reject event?</Text>
            <Text style={styles.modalBody}>
              Optional reason (leave blank to reject without one).
            </Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason (optional)"
              placeholderTextColor={colors.inverseOnSurface}
              multiline
            />
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setRejectTarget(null)}
              />
              <Button
                label="Reject"
                onPress={confirmAndroidReject}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.onBackground,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#b45309",
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
  cover: {
    height: 160,
    backgroundColor: colors.surfaceContainerLow,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  coverPlaceholderText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.primary,
    opacity: 0.5,
  },
  pendingBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: "#fef3c7",
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#b45309",
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tagPrimary: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagPrimaryText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.onPrimaryContainer,
  },
  tagMuted: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagMutedText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.onBackground,
  },
  school: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  when: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  goLive: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0369a1",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  location: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
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
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  approveLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  rejectLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.error,
  },
  pressed: {
    opacity: 0.75,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBackground,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  modalInput: {
    minHeight: 88,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    fontSize: 15,
    color: colors.onSurface,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
});
