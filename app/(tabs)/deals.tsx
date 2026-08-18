import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Bookmark } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { DealCard } from "@/components/DealCard";
import { ListSkeleton } from "@/components/ListSkeleton";
import { SearchEntryRow } from "@/components/SearchEntryRow";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  useTabBarCollapseScrollHandler,
  useTabBarMotion,
} from "@/context/TabBarMotionContext";
import { partitionDeals } from "@/lib/eventTiming";
import { asScheduleParam } from "@/lib/routeParams";
import { useDeals } from "@/lib/useDeals";
import { useSavedDeals } from "@/lib/useSavedDeals";
import { floatingTabBarScrollPadding } from "@/lib/tabBar";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import { OFFICIAL_DEAL_CATEGORIES } from "@/types/database";

const CATEGORIES = [
  { id: "all", label: "All", value: "All" },
  ...OFFICIAL_DEAL_CATEGORIES.map((category) => ({
    id: category,
    label: category,
    value: category,
  })),
];

type ScheduleTab = "all" | "live" | "coming_soon";

export default function DealsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ schedule?: string | string[] }>();
  const { deals, isLoading, isRefreshing, error, refresh } = useDeals();
  const { savedIds, isLoading: savedLoading, toggleSave } = useSavedDeals();
  const { openSearch } = useTabBarMotion();
  const onScroll = useTabBarCollapseScrollHandler();
  const [activeCategory, setActiveCategory] = useState("All");
  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>("all");

  useEffect(() => {
    const schedule = asScheduleParam(params.schedule);
    if (schedule) setScheduleTab(schedule);
  }, [params.schedule]);

  const { live, comingSoon } = useMemo(() => partitionDeals(deals), [deals]);

  const filteredDeals = useMemo(() => {
    // All: live first, then coming soon (nearest launch first).
    const pool =
      scheduleTab === "coming_soon"
        ? comingSoon
        : scheduleTab === "live"
          ? live
          : [...live, ...comingSoon];
    if (activeCategory === "All") return pool;
    return pool.filter((deal) => deal.category === activeCategory);
  }, [live, comingSoon, scheduleTab, activeCategory]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.stickyHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Deals</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Saved deals"
            onPress={() => router.push("/saved" as Href)}
            style={({ pressed }) => [
              styles.savedBtn,
              pressed && styles.pressed,
            ]}
          >
            <Bookmark color={colors.primary} size={20} />
          </Pressable>
        </View>
        <SearchEntryRow
          placeholder="Search deals, brands, categories"
          onPress={(layout) => openSearch(layout, { scope: "deals" })}
        />

        <View style={styles.scheduleWrap}>
          <SegmentedControl
            value={scheduleTab}
            onChange={setScheduleTab}
            options={[
              { value: "all", label: "All", count: deals.length },
              { value: "live", label: "Live", count: live.length },
              {
                value: "coming_soon",
                label: "Coming Soon",
                count: comingSoon.length,
              },
            ]}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((category) => {
            const isActive = category.value === activeCategory;
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setActiveCategory(category.value)}
                style={[styles.pill, isActive && styles.pillActive]}
              >
                <Text
                  style={[styles.pillText, isActive && styles.pillTextActive]}
                >
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : (
        <Animated.FlatList
          data={filteredDeals}
          keyExtractor={(deal) => String(deal.id)}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: floatingTabBarScrollPadding(insets.bottom) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <DealCard
              deal={item}
              saved={savedIds.has(item.id)}
              saveDisabled={savedLoading}
              onToggleSave={toggleSave}
              onPress={(deal) => router.push(`/deal/${deal.id}` as Href)}
            />
          )}
          ListHeaderComponent={
            error ? (
              <View style={styles.errorBlock}>
                <Text style={styles.errorText}>{error}</Text>
                <Button label="Retry" onPress={() => void refresh()} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.stateBlock}>
              <Text style={styles.stateTitle}>
                {error
                  ? "Could not load deals"
                  : scheduleTab === "coming_soon"
                    ? "No coming soon deals"
                    : "No deals match that"}
              </Text>
              <Text style={styles.stateBody}>
                {error
                  ? error
                  : scheduleTab === "coming_soon"
                    ? "Scheduled deals will appear here until their go-live date."
                    : "Try a different category or switch back to All."}
              </Text>
              {error ? (
                <Button label="Retry" onPress={() => void refresh()} />
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stickyHeader: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  titleRow: {
    marginHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.onBackground,
  },
  savedBtn: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  pressed: {
    opacity: 0.85,
  },
  scheduleWrap: {
    paddingHorizontal: spacing.lg,
  },
  categoryRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pill: {
    minHeight: MIN_TAP_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  pillTextActive: {
    color: colors.onPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorBlock: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
    marginBottom: spacing.sm,
  },
  stateBlock: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
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
