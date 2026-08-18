import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { Package, Plus } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useAuth } from "@/context/AuthContext";
import {
  getPartnerDealLifecycle,
  usePartnerDeals,
  type PartnerDealLifecycle,
} from "@/lib/usePartnerDeals";
import { usePartnerBrand } from "@/lib/usePartnerBrand";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import type { PartnerDeal } from "@/types/database";

type FilterValue = "all" | "active" | "scheduled" | "expired" | "pending";

const FILTERS: readonly { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired" },
];

function statusBadgeColors(lifecycle: PartnerDealLifecycle): {
  backgroundColor: string;
  color: string;
} {
  switch (lifecycle) {
    case "active":
      return { backgroundColor: colors.primaryContainer, color: colors.onPrimaryContainer };
    case "scheduled":
      return {
        backgroundColor: colors.infoContainer,
        color: colors.onInfoContainer,
      };
    case "expired":
      return { backgroundColor: colors.surfaceContainerHigh, color: colors.onSurface };
    case "pending":
      return { backgroundColor: "#fef3c7", color: "#b45309" };
    case "rejected":
      return { backgroundColor: "#fee2e2", color: "#b91c1c" };
    default:
      return { backgroundColor: "#fef3c7", color: "#b45309" };
  }
}

function PartnerDealCard({
  deal,
  deleting,
  onEdit,
  onDelete,
}: {
  deal: PartnerDeal;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const lifecycle = getPartnerDealLifecycle(deal);
  const badge = statusBadgeColors(lifecycle);

  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        {deal.imageUrl ? (
          <Image
            source={{ uri: deal.imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Package color={colors.onSurfaceVariant} size={28} />
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {lifecycle}
          </Text>
        </View>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{deal.type}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.category}>{deal.category}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {deal.title}
        </Text>
        <View style={styles.discountPill}>
          <Text style={styles.discount}>{deal.discount}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onEdit}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.editBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.editLabel}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={deleting}
            onPress={onDelete}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.deleteBtn,
              (pressed || deleting) && styles.pressed,
            ]}
          >
            {deleting ? (
              <ActivityIndicator color={colors.error} size="small" />
            ) : (
              <Text style={styles.deleteLabel}>Delete</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function PartnerDealsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    brandId,
    brandName,
    isLoading: brandLoading,
    error: brandError,
  } = usePartnerBrand(user?.id);

  const {
    deals,
    metrics,
    isLoading,
    isRefreshing,
    error,
    refresh,
    deleteDeal,
  } = usePartnerDeals(brandId, user?.id);

  const filtered = useMemo(() => {
    if (filter === "all") return deals;
    return deals.filter(
      (deal) => getPartnerDealLifecycle(deal) === filter,
    );
  }, [deals, filter]);

  const filterOptions = useMemo(
    () =>
      FILTERS.map((item) => ({
        ...item,
        count:
          item.value === "all"
            ? metrics.total
            : item.value === "pending"
              ? metrics.pending
              : item.value === "active"
                ? metrics.active
                : item.value === "scheduled"
                  ? metrics.scheduled
                  : metrics.expired,
      })),
    [metrics],
  );

  const confirmDelete = useCallback(
    (deal: PartnerDeal) => {
      Alert.alert(
        "Delete deal?",
        `“${deal.title}” will be permanently removed.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                setDeletingId(deal.id);
                const deleteError = await deleteDeal(deal.id);
                setDeletingId(null);
                if (deleteError) {
                  Alert.alert("Could not delete", deleteError);
                }
              })();
            },
          },
        ],
      );
    },
    [deleteDeal],
  );

  const loading = brandLoading || isLoading;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.subhead}>
            {metrics.total} deal{metrics.total === 1 ? "" : "s"}
            {brandName ? ` for ${brandName}` : ""}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create deal"
          onPress={() => router.push("/create-deal" as Href)}
          style={({ pressed }) => [
            styles.createBtn,
            pressed && styles.pressed,
          ]}
        >
          <Plus color={colors.onPrimary} size={20} />
        </Pressable>
      </View>

      {(error || brandError) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error ?? brandError}</Text>
        </View>
      )}

      <SegmentedControl
        options={filterOptions}
        value={filter}
        onChange={setFilter}
      />

      {loading && deals.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Package color={colors.onSurfaceVariant} size={40} />
              <Text style={styles.emptyTitle}>No deals found</Text>
              <Text style={styles.emptyBody}>
                {filter === "all"
                  ? "Create your first deal to get started."
                  : filter === "pending"
                    ? "New deals are published automatically, so this list is usually empty."
                    : "No deals with this status."}
              </Text>
              {filter === "all" ? (
                <Button
                  label="Create Deal"
                  onPress={() => router.push("/create-deal" as Href)}
                />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <PartnerDealCard
              deal={item}
              deleting={deletingId === item.id}
              onEdit={() =>
                router.push(`/edit-deal/${item.id}` as Href)
              }
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onBackground,
  },
  subhead: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  createBtn: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onErrorContainer,
  },
  list: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBackground,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: "hidden",
  },
  imageWrap: {
    height: 160,
    backgroundColor: colors.surfaceContainerLow,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  typePill: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  typePillText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.onSurface,
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  category: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onBackground,
  },
  discountPill: {
    alignSelf: "flex-start",
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  discount: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    minHeight: MIN_TAP_TARGET - 4,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: "rgba(41,105,91,0.08)",
    borderColor: "rgba(41,105,91,0.2)",
  },
  editLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  deleteBtn: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  deleteLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.error,
  },
  pressed: {
    opacity: 0.85,
  },
});
