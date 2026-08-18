import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Plus } from "lucide-react-native";
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
import { EventCard } from "@/components/EventCard";
import { ListSkeleton } from "@/components/ListSkeleton";
import { SearchEntryRow } from "@/components/SearchEntryRow";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  useTabBarCollapseScrollHandler,
  useTabBarMotion,
} from "@/context/TabBarMotionContext";
import { partitionEvents, splitLiveEvents } from "@/lib/eventTiming";
import { asScheduleParam } from "@/lib/routeParams";
import { useEvents } from "@/lib/useEvents";
import { floatingTabBarScrollPadding } from "@/lib/tabBar";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import { EVENT_CATEGORY_OPTIONS } from "@/types/database";

const CATEGORIES = [
  { id: "all", label: "All", value: "All" },
  ...EVENT_CATEGORY_OPTIONS.map((category) => ({
    id: category.value,
    label: category.label,
    value: category.value,
  })),
];

type ScheduleTab = "all" | "live" | "coming_soon";

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ schedule?: string | string[] }>();
  const { events, isLoading, isRefreshing, error, refresh } = useEvents();
  const { openSearch } = useTabBarMotion();
  const onScroll = useTabBarCollapseScrollHandler();
  const [activeCategory, setActiveCategory] = useState("All");
  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>("all");

  useEffect(() => {
    const schedule = asScheduleParam(params.schedule);
    if (schedule) setScheduleTab(schedule);
  }, [params.schedule]);

  const { live, comingSoon } = useMemo(
    () => partitionEvents(events),
    [events],
  );
  const { active: current } = useMemo(
    () => splitLiveEvents(live),
    [live],
  );

  const filteredEvents = useMemo(() => {
    // All: current first, then coming soon (nearest go-live first).
    // Past events are excluded from every tab.
    const pool =
      scheduleTab === "coming_soon"
        ? comingSoon
        : scheduleTab === "live"
          ? current
          : [...current, ...comingSoon];
    if (activeCategory === "All") return pool;
    return pool.filter((event) => event.category === activeCategory);
  }, [current, comingSoon, scheduleTab, activeCategory]);

  const visibleTotal = current.length + comingSoon.length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.stickyHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Events</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit an Event"
            onPress={() => router.push("/create-event" as Href)}
            style={({ pressed }) => [
              styles.submitChip,
              pressed && styles.pressed,
            ]}
          >
            <Plus color={colors.onPrimary} size={16} />
            <Text style={styles.submitChipLabel}>Submit</Text>
          </Pressable>
        </View>

        <SearchEntryRow
          placeholder="Search events, universities, categories"
          onPress={(layout) => openSearch(layout, { scope: "events" })}
        />

        <View style={styles.scheduleWrap}>
          <SegmentedControl
            value={scheduleTab}
            onChange={setScheduleTab}
            options={[
              { value: "all", label: "All", count: visibleTotal },
              { value: "live", label: "Live", count: current.length },
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
          data={filteredEvents}
          keyExtractor={(event) => event.id}
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
            <EventCard
              event={item}
              onPress={(event) => router.push(`/event/${event.id}` as Href)}
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
                  ? "Could not load events"
                  : scheduleTab === "coming_soon"
                    ? "No coming soon events"
                    : visibleTotal === 0
                      ? "No events yet"
                      : "No events match that"}
              </Text>
              <Text style={styles.stateBody}>
                {error
                  ? error
                  : scheduleTab === "coming_soon"
                    ? "Scheduled listings will appear here until their go-live date."
                    : visibleTotal === 0
                      ? "We are partnering with university societies to bring campus events here. Check back soon, or submit one yourself."
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
  submitChip: {
    minHeight: MIN_TAP_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  submitChipLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onPrimary,
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
  pressed: {
    opacity: 0.85,
  },
});
