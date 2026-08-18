import { Image } from "expo-image";
import { CalendarDays, Search, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
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

import { useAdminEvents } from "@/lib/useAdmin";
import { colors, radius, spacing } from "@/theme";
import type { CampusEvent } from "@/types/database";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function displayStatus(event: CampusEvent): string {
  if (
    event.status === "approved" &&
    event.publishAt &&
    new Date(event.publishAt) > new Date()
  ) {
    return "coming soon";
  }
  return event.status;
}

function statusBadgeColors(status: string): {
  backgroundColor: string;
  color: string;
} {
  switch (status) {
    case "approved":
      return {
        backgroundColor: colors.primaryContainer,
        color: colors.onPrimaryContainer,
      };
    case "coming soon":
      return { backgroundColor: "#e0f2fe", color: "#0369a1" };
    case "rejected":
      return { backgroundColor: "#fee2e2", color: "#b91c1c" };
    case "pending":
      return { backgroundColor: "#fef3c7", color: "#b45309" };
    default:
      return {
        backgroundColor: colors.surfaceContainerHigh,
        color: colors.onSurface,
      };
  }
}

function EventCard({
  event,
  acting,
  onDelete,
}: {
  event: CampusEvent;
  acting: boolean;
  onDelete: () => void;
}) {
  const status = displayStatus(event);
  const badge = statusBadgeColors(status);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          {event.coverImageUrl ? (
            <Image
              source={{ uri: event.coverImageUrl }}
              style={styles.thumbImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <CalendarDays color={colors.onSurfaceVariant} size={22} />
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={styles.meta}>
            {event.category || "Uncategorized"}
            {event.universityName ? ` · ${event.universityName}` : ""}
          </Text>
          {event.clubName ? (
            <Text style={styles.club} numberOfLines={1}>
              {event.clubName}
            </Text>
          ) : null}
        </View>
        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {status}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Start</Text>
        <Text style={styles.detailValue}>{formatWhen(event.startTime)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Go-live</Text>
        <Text style={styles.detailValue}>{formatWhen(event.publishAt)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>RSVPs</Text>
        <Text style={styles.detailValue}>{event.rsvpCount}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete event"
        disabled={acting}
        onPress={onDelete}
        style={({ pressed }) => [
          styles.deleteBtn,
          (pressed || acting) && styles.pressed,
        ]}
      >
        {acting ? (
          <ActivityIndicator color={colors.error} size="small" />
        ) : (
          <>
            <Trash2 color={colors.error} size={16} />
            <Text style={styles.deleteLabel}>Delete</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

export default function AdminEventsScreen() {
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(inputValue.trim()), 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const {
    events,
    isLoading,
    isRefreshing,
    actingId,
    error,
    message,
    refresh,
    deleteEvent,
  } = useAdminEvents(searchQuery);

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
              Full event catalogue with search and deletion.
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
            <View style={styles.searchWrap}>
              <Search color={colors.onSurfaceVariant} size={18} />
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Search title, category, or university..."
                placeholderTextColor={colors.inverseOnSurface}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyBody}>No events found.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            acting={actingId === item.id}
            onDelete={() => {
              Alert.alert(
                "Delete event?",
                "Are you sure you want to delete this event permanently?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      void deleteEvent(item.id);
                    },
                  },
                ],
              );
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
    gap: spacing.md,
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
    paddingVertical: spacing.sm,
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
  },
  emptyBody: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainerLow,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onBackground,
  },
  meta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    textTransform: "capitalize",
  },
  club: {
    fontSize: 12,
    color: colors.outline,
  },
  badge: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "600",
    color: colors.onBackground,
  },
  deleteBtn: {
    marginTop: spacing.sm,
    minHeight: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  deleteLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.error,
  },
  pressed: {
    opacity: 0.75,
  },
});
