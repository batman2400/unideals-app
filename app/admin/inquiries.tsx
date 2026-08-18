import * as Linking from "expo-linking";
import { Archive, Mail, Reply } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SegmentedControl } from "@/components/SegmentedControl";
import {
  useAdminInquiries,
  type InquiryFilter,
} from "@/lib/useAdminInquiries";
import { colors, radius, spacing } from "@/theme";
import type { Inquiry } from "@/types/database";

const FILTERS: readonly { value: InquiryFilter; label: string }[] = [
  { value: "new", label: "New" },
  { value: "all", label: "All History" },
];

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusColors(status: string): { backgroundColor: string; color: string } {
  switch (status) {
    case "new":
      return { backgroundColor: "#fef3c7", color: "#b45309" };
    case "read":
      return {
        backgroundColor: colors.primaryContainer,
        color: colors.onPrimaryContainer,
      };
    default:
      return {
        backgroundColor: colors.surfaceContainerHigh,
        color: colors.onSurfaceVariant,
      };
  }
}

function typeColors(type: string): { backgroundColor: string; color: string } {
  switch (type) {
    case "partner":
      return { backgroundColor: "#f3e8ff", color: "#7e22ce" };
    case "event":
      return { backgroundColor: "#fce7f3", color: "#be185d" };
    case "support":
      return { backgroundColor: "#ffe4e6", color: "#e11d48" };
    default:
      return { backgroundColor: "#dbeafe", color: "#1d4ed8" };
  }
}

function InquiryCard({
  inquiry,
  acting,
  onMarkRead,
  onArchive,
}: {
  inquiry: Inquiry;
  acting: boolean;
  onMarkRead: () => void;
  onArchive: () => void;
}) {
  const status = statusColors(inquiry.status);
  const type = typeColors(inquiry.inquiryType);
  const replySubject = `Re: Uni Deals ${inquiry.inquiryType.charAt(0).toUpperCase()}${inquiry.inquiryType.slice(1)} Inquiry`;

  return (
    <View
      style={[
        styles.card,
        inquiry.status === "new" && styles.cardNew,
      ]}
    >
      {inquiry.status === "new" ? <View style={styles.newBar} /> : null}
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: status.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>
            {inquiry.status}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: type.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: type.color }]}>
            {inquiry.inquiryType}
          </Text>
        </View>
        <Text style={styles.when}>{formatWhen(inquiry.createdAt)}</Text>
      </View>

      <Text style={styles.name}>{inquiry.name}</Text>
      <Text style={styles.email}>{inquiry.email}</Text>
      {inquiry.brandName ? (
        <Text style={styles.brand}>Brand: {inquiry.brandName}</Text>
      ) : null}

      <View style={styles.messageBox}>
        <Text style={styles.message}>{inquiry.message}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Linking.openURL(
              `mailto:${inquiry.email}?subject=${encodeURIComponent(replySubject)}`,
            );
          }}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.replyBtn,
            pressed && styles.pressed,
          ]}
        >
          <Reply color={colors.onPrimary} size={16} />
          <Text style={styles.replyLabel}>Reply</Text>
        </Pressable>
        {inquiry.status === "new" ? (
          <Pressable
            accessibilityRole="button"
            disabled={acting}
            onPress={onMarkRead}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.secondaryBtn,
              (pressed || acting) && styles.pressed,
            ]}
          >
            {acting ? (
              <ActivityIndicator color={colors.onBackground} size="small" />
            ) : (
              <>
                <Mail color={colors.onBackground} size={16} />
                <Text style={styles.secondaryLabel}>Mark Read</Text>
              </>
            )}
          </Pressable>
        ) : null}
        {inquiry.status !== "archived" ? (
          <Pressable
            accessibilityRole="button"
            disabled={acting}
            onPress={onArchive}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.secondaryBtn,
              (pressed || acting) && styles.pressed,
            ]}
          >
            <Archive color={colors.onBackground} size={16} />
            <Text style={styles.secondaryLabel}>Archive</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function AdminInquiriesScreen() {
  const [filter, setFilter] = useState<InquiryFilter>("new");
  const {
    inquiries,
    isLoading,
    isRefreshing,
    actingId,
    error,
    refresh,
    setStatus,
  } = useAdminInquiries(filter);

  return (
    <View style={styles.root}>
      <FlatList
        data={inquiries}
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
              Manage contact form submissions and partner applications.
            </Text>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <SegmentedControl
              options={FILTERS}
              value={filter}
              onChange={setFilter}
            />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Inbox Zero</Text>
              <Text style={styles.emptyBody}>
                {filter === "new"
                  ? "You have no new inquiries."
                  : "No inquiries have been submitted yet."}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <InquiryCard
            inquiry={item}
            acting={actingId === item.id}
            onMarkRead={() => {
              void setStatus(item.id, "read");
            }}
            onArchive={() => {
              void setStatus(item.id, "archived");
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
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
  },
  cardNew: {
    borderColor: colors.primary,
  },
  newBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  when: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  name: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onBackground,
  },
  email: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  brand: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  messageBox: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onBackground,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  replyBtn: {
    backgroundColor: colors.primary,
  },
  replyLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  secondaryBtn: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  secondaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onBackground,
  },
  pressed: {
    opacity: 0.75,
  },
});
