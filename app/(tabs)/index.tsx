import { BadgeCheck, Search, TriangleAlert } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DealCard } from "@/components/DealCard";
import { useAuth } from "@/context/AuthContext";
import { filterDeals, useDeals } from "@/lib/useDeals";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import type { Deal, DealType } from "@/types/database";

type TypeFilter = "All" | DealType;

const TYPE_FILTERS: readonly TypeFilter[] = ["All", "Online", "In-Store"];

export default function ExploreDealsScreen() {
  const { metadata, isVerified, role } = useAuth();
  const { deals, isLoading, isRefreshing, error, refresh } = useDeals();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");

  const visibleDeals = useMemo(() => {
    const byType =
      typeFilter === "All"
        ? deals
        : deals.filter((deal) => deal.type === typeFilter);

    return filterDeals(byType, query);
  }, [deals, typeFilter, query]);

  const firstName = (metadata.full_name ?? "").trim().split(" ")[0];
  const showVerifyPrompt = role === "student" && !isVerified;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList<Deal>
        data={visibleDeals}
        keyExtractor={(deal) => String(deal.id)}
        renderItem={({ item }) => <DealCard deal={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>
              {firstName ? `Hey ${firstName}` : "Explore deals"}
            </Text>
            <Text style={styles.subtitle}>
              {visibleDeals.length} live student {visibleDeals.length === 1 ? "deal" : "deals"} right now
            </Text>

            {showVerifyPrompt ? (
              <View style={styles.verifyBanner}>
                <BadgeCheck color={colors.onPrimaryContainer} size={18} />
                <Text style={styles.verifyText}>
                  Verify your student status in Profile to unlock redemption
                  codes and in-store tickets.
                </Text>
              </View>
            ) : null}

            <View style={styles.searchField}>
              <Search color={colors.onSurfaceVariant} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search deals, brands, categories"
                placeholderTextColor={colors.inverseOnSurface}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>

            <View style={styles.filterRow}>
              {TYPE_FILTERS.map((filter) => {
                const isActive = filter === typeFilter;

                return (
                  <Text
                    key={filter}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setTypeFilter(filter)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    {filter}
                  </Text>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.stateBlock}>
              {error ? (
                <>
                  <TriangleAlert color={colors.error} size={24} />
                  <Text style={styles.stateTitle}>Could not load deals</Text>
                  <Text style={styles.stateBody}>{error}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.stateTitle}>No deals match that</Text>
                  <Text style={styles.stateBody}>
                    Try a different search term or switch the filter back to
                    All.
                  </Text>
                </>
              )}
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.onBackground,
  },
  subtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: -spacing.sm,
  },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
  },
  verifyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.onPrimaryContainer,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: MIN_TAP_TARGET + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chip: {
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainer,
  },
  chipActive: {
    color: colors.onPrimary,
    backgroundColor: colors.primary,
  },
  stateBlock: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl * 2,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onBackground,
  },
  stateBody: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
});
