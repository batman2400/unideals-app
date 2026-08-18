import { Image } from "expo-image";
import { Check, Pause, Play, Search, Trash2 } from "lucide-react-native";
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

import { SegmentedControl } from "@/components/SegmentedControl";
import {
  useAdminDeals,
  type AdminDealStatusFilter,
} from "@/lib/useAdmin";
import { colors, radius, spacing } from "@/theme";
import type { AdminDeal, AdminDealLifecycle } from "@/types/database";
import { getAdminDealLifecycle } from "@/types/database";

const FILTERS: readonly { value: AdminDealStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "paused", label: "Paused" },
];

function statusBadgeColors(lifecycle: AdminDealLifecycle): {
  backgroundColor: string;
  color: string;
} {
  switch (lifecycle) {
    case "active":
      return {
        backgroundColor: colors.primaryContainer,
        color: colors.onPrimaryContainer,
      };
    case "scheduled":
      return {
        backgroundColor: colors.infoContainer,
        color: colors.onInfoContainer,
      };
    case "expired":
      return {
        backgroundColor: colors.surfaceContainerHigh,
        color: colors.onSurface,
      };
    case "paused":
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

function AdminDealCard({
  deal,
  acting,
  onApprove,
  onPause,
  onActivate,
  onDelete,
}: {
  deal: AdminDeal;
  acting: boolean;
  onApprove: () => void;
  onPause: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const lifecycle = getAdminDealLifecycle(deal);
  const badge = statusBadgeColors(lifecycle);
  const isInStore = deal.type === "In-Store";

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          {deal.imageUrl ? (
            <Image
              source={{ uri: deal.imageUrl }}
              style={styles.thumbImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.thumbPlaceholder} />
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {deal.title}
          </Text>
          <Text style={styles.brand}>{deal.brand}</Text>
          <Text style={styles.discount}>{deal.discount}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {lifecycle === "expired" ? "finished" : lifecycle}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>
          Type <Text style={styles.statValue}>{deal.type}</Text>
        </Text>
        <Text style={styles.stat}>
          Reveals{" "}
          <Text style={styles.statValue}>
            {isInStore ? "—" : deal.totalReveals}
          </Text>
        </Text>
        <Text style={styles.stat}>
          Tickets{" "}
          <Text style={styles.statValue}>
            {isInStore ? deal.totalTicketsGenerated : "—"}
          </Text>
        </Text>
        <Text style={styles.stat}>
          Redeemed{" "}
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {isInStore ? deal.totalTicketsRedeemed : "—"}
          </Text>
        </Text>
      </View>

      <View style={styles.actions}>
        {lifecycle === "pending" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Approve deal"
            disabled={acting}
            onPress={onApprove}
            style={({ pressed }) => [
              styles.iconBtn,
              styles.approveBtn,
              (pressed || acting) && styles.pressed,
            ]}
          >
            <Check color={colors.onPrimary} size={18} />
            <Text style={styles.approveLabel}>Approve</Text>
          </Pressable>
        )}
        {(lifecycle === "active" || lifecycle === "scheduled") && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pause deal"
            disabled={acting}
            onPress={onPause}
            style={({ pressed }) => [
              styles.iconBtn,
              (pressed || acting) && styles.pressed,
            ]}
          >
            <Pause color={colors.onSurfaceVariant} size={18} />
            <Text style={styles.iconBtnLabel}>Pause</Text>
          </Pressable>
        )}
        {lifecycle === "paused" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Activate deal"
            disabled={acting}
            onPress={onActivate}
            style={({ pressed }) => [
              styles.iconBtn,
              (pressed || acting) && styles.pressed,
            ]}
          >
            <Play color={colors.primary} size={18} />
            <Text style={[styles.iconBtnLabel, { color: colors.primary }]}>
              Activate
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete deal"
          disabled={acting}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.iconBtn,
            styles.deleteBtn,
            (pressed || acting) && styles.pressed,
          ]}
        >
          {acting ? (
            <ActivityIndicator color={colors.error} size="small" />
          ) : (
            <>
              <Trash2 color={colors.error} size={18} />
              <Text style={styles.deleteLabel}>Delete</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function AdminDealsView({
  finishedOnly = false,
}: {
  finishedOnly?: boolean;
}) {
  const [statusFilter, setStatusFilter] =
    useState<AdminDealStatusFilter>("all");
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(inputValue.trim()), 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const activeFilter: AdminDealStatusFilter = finishedOnly
    ? "expired"
    : statusFilter;

  const {
    deals,
    totalCount,
    pageLimit,
    isLoading,
    isRefreshing,
    actingId,
    error,
    message,
    refresh,
    setDealStatus,
    deleteDeal,
  } = useAdminDeals(activeFilter, searchQuery);

  return (
    <View style={styles.root}>
      <FlatList
        data={deals}
        keyExtractor={(item) => String(item.id)}
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
              {finishedOnly
                ? "Ended offers are hidden from students. Delete them here if they should be removed."
                : "Full deal catalogue with status management, search, and tracking stats. Finished deals live in Finished Deals."}
            </Text>
            {!finishedOnly && statusFilter === "all" && totalCount > pageLimit ? (
              <Text style={styles.capNote}>
                Showing first {pageLimit} of {totalCount}
              </Text>
            ) : null}
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
                placeholder="Search by title or brand..."
                placeholderTextColor={colors.inverseOnSurface}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {finishedOnly ? null : (
              <SegmentedControl
                options={FILTERS}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyBody}>
                {finishedOnly ? "No finished deals." : "No deals found."}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <AdminDealCard
            deal={item}
            acting={actingId === item.id}
            onApprove={() => {
              void setDealStatus(item.id, "approved");
            }}
            onPause={() => {
              void setDealStatus(item.id, "paused");
            }}
            onActivate={() => {
              void setDealStatus(item.id, "approved");
            }}
            onDelete={() => {
              Alert.alert(
                "Delete deal?",
                "Are you sure you want to delete this deal permanently?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      void deleteDeal(item.id);
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

export default function AdminDealsScreen() {
  return <AdminDealsView />;
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
  capNote: {
    fontSize: 12,
    fontWeight: "600",
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
    gap: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
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
    backgroundColor: colors.surfaceContainer,
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
  brand: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  discount: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.primary,
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
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  stat: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  statValue: {
    fontWeight: "800",
    color: colors.onBackground,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  iconBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconBtnLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  approveBtn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  approveLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onPrimary,
  },
  deleteBtn: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
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
