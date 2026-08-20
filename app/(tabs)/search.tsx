import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { ChevronLeft, Search, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandResultRow } from "@/components/BrandResultRow";
import { Button } from "@/components/Button";
import { DealCard } from "@/components/DealCard";
import { EventCard } from "@/components/EventCard";
import { ListSkeleton } from "@/components/ListSkeleton";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  useTabBarMotion,
  type SearchScope,
} from "@/context/TabBarMotionContext";
import {
  partitionDeals,
  partitionEvents,
  splitLiveEvents,
} from "@/lib/eventTiming";
import {
  SEARCH_FIELD_HEIGHT,
  SEARCH_FOCUS_AT,
  SEARCH_MORPH_MS,
  floatingTabBarScrollPadding,
} from "@/lib/tabBar";
import {
  filterDealBrands,
  filterDeals,
  uniqueDealBrands,
  useDeals,
  type DealBrandSummary,
} from "@/lib/useDeals";
import { filterEvents, useEvents } from "@/lib/useEvents";
import { useSavedDeals } from "@/lib/useSavedDeals";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import type { CampusEvent, Deal } from "@/types/database";

type SearchItem =
  | { kind: "header"; id: string; title: string }
  | { kind: "brand"; id: string; brand: DealBrandSummary }
  | { kind: "deal"; id: string; deal: Deal }
  | { kind: "event"; id: string; event: CampusEvent };

function asSearchScope(param: string | string[] | undefined): SearchScope {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === "deals" || value === "events" || value === "brands") {
    return value;
  }
  return "all";
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scope?: string | string[] }>();
  const { searchFieldVisible, leaveSearch, morphProgress } = useTabBarMotion();
  const inputRef = useRef<TextInput>(null);

  const { deals, isLoading: dealsLoading, isRefreshing: dealsRefreshing, error: dealsError, refresh: refreshDeals } =
    useDeals();
  const { events, isLoading: eventsLoading, isRefreshing: eventsRefreshing, error: eventsError, refresh: refreshEvents } =
    useEvents();
  const { savedIds, isLoading: savedLoading, toggleSave } = useSavedDeals();

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>(() =>
    asSearchScope(params.scope),
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  useEffect(() => {
    setScope(asSearchScope(params.scope));
  }, [params.scope]);

  const focusSearchField = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(
        focusSearchField,
        Math.round(SEARCH_MORPH_MS * SEARCH_FOCUS_AT),
      );
      return () => clearTimeout(timer);
    }, [focusSearchField]),
  );

  const screenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0.18, 1], [0, 1]),
  }));

  const fieldRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0.62, 1], [0.02, 1]),
  }));

  const backRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0.55, 1], [0, 1]),
  }));

  const { live: liveDeals, comingSoon: comingSoonDeals } = useMemo(
    () => partitionDeals(deals),
    [deals],
  );
  const { live: liveEvents, comingSoon: comingSoonEvents } = useMemo(
    () => partitionEvents(events),
    [events],
  );
  const { active: activeEvents } = useMemo(
    () => splitLiveEvents(liveEvents),
    [liveEvents],
  );

  const dealPool = useMemo(
    () => [...liveDeals, ...comingSoonDeals],
    [comingSoonDeals, liveDeals],
  );
  const eventPool = useMemo(
    () => [...activeEvents, ...comingSoonEvents],
    [activeEvents, comingSoonEvents],
  );
  const brands = useMemo(() => uniqueDealBrands(dealPool), [dealPool]);

  const items = useMemo(() => {
    const trimmed = query.trim();
    const next: SearchItem[] = [];

    if (selectedBrand) {
      const brandDeals = filterDeals(
        dealPool.filter(
          (deal) =>
            deal.brand.trim().toLowerCase() === selectedBrand.toLowerCase(),
        ),
        query,
      );
      if (brandDeals.length > 0) {
        next.push({
          kind: "header",
          id: "header-brand-deals",
          title: selectedBrand,
        });
        for (const deal of brandDeals) {
          next.push({ kind: "deal", id: `deal-${deal.id}`, deal });
        }
      }
      return next;
    }

    const matchedBrands =
      scope === "deals" || scope === "events"
        ? []
        : filterDealBrands(brands, query);
    const matchedDeals =
      scope === "events" || scope === "brands"
        ? []
        : filterDeals(dealPool, query);
    const matchedEvents =
      scope === "deals" || scope === "brands"
        ? []
        : filterEvents(eventPool, query);

    const brandSlice = trimmed ? matchedBrands : matchedBrands.slice(0, 6);
    const dealSlice = trimmed ? matchedDeals : matchedDeals.slice(0, 8);
    const eventSlice = trimmed ? matchedEvents : matchedEvents.slice(0, 6);

    if (brandSlice.length > 0) {
      next.push({
        kind: "header",
        id: "header-brands",
        title: trimmed || scope === "brands" ? "Brands" : "Suggested brands",
      });
      for (const brand of brandSlice) {
        next.push({
          kind: "brand",
          id: `brand-${brand.name.toLowerCase()}`,
          brand,
        });
      }
    }
    if (dealSlice.length > 0) {
      next.push({
        kind: "header",
        id: "header-deals",
        title: trimmed ? "Deals" : "Suggested deals",
      });
      for (const deal of dealSlice) {
        next.push({ kind: "deal", id: `deal-${deal.id}`, deal });
      }
    }
    if (eventSlice.length > 0) {
      next.push({
        kind: "header",
        id: "header-events",
        title: trimmed ? "Events" : "Suggested events",
      });
      for (const event of eventSlice) {
        next.push({ kind: "event", id: `event-${event.id}`, event });
      }
    }
    return next;
  }, [brands, dealPool, eventPool, query, scope, selectedBrand]);

  const isLoading = dealsLoading || eventsLoading;
  const isRefreshing = dealsRefreshing || eventsRefreshing;
  const error = dealsError || eventsError;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View style={[styles.screen, screenStyle]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Animated.View style={backRevealStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => leaveSearch()}
            disabled={!searchFieldVisible}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.pressed,
            ]}
          >
            <ChevronLeft color={colors.primary} size={26} />
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.field, fieldRevealStyle]}>
          <Search color={colors.onSurfaceVariant} size={18} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search deals, events, and brands"
            placeholderTextColor={colors.inverseOnSurface}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={false}
            caretHidden={!searchFieldVisible}
            editable
            returnKeyType="search"
            showSoftInputOnFocus
            blurOnSubmit={false}
          />
        </Animated.View>
      </View>

      <Animated.View style={styles.body}>
        <View style={styles.scopeWrap}>
          <SegmentedControl
            value={scope}
            onChange={(next) => {
              setScope(next);
              setSelectedBrand(null);
              router.setParams({ scope: next });
            }}
            options={[
              { value: "all", label: "All" },
              { value: "deals", label: "Deals" },
              { value: "events", label: "Events" },
              { value: "brands", label: "Brands" },
            ]}
          />
        </View>

      {selectedBrand ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Clear ${selectedBrand} filter`}
          onPress={() => setSelectedBrand(null)}
          style={({ pressed }) => [
            styles.brandChip,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.brandChipLabel} numberOfLines={1}>
            {selectedBrand}
          </Text>
          <X color={colors.onPrimary} size={14} strokeWidth={2.4} />
        </Pressable>
      ) : null}

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: floatingTabBarScrollPadding(insets.bottom) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void refreshDeals();
                void refreshEvents();
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            if (item.kind === "header") {
              return <Text style={styles.sectionTitle}>{item.title}</Text>;
            }
            if (item.kind === "brand") {
              return (
                <BrandResultRow
                  brand={item.brand}
                  onPress={(brand) => setSelectedBrand(brand.name)}
                />
              );
            }
            if (item.kind === "deal") {
              return (
                <DealCard
                  deal={item.deal}
                  saved={savedIds.has(item.deal.id)}
                  saveDisabled={savedLoading}
                  onToggleSave={toggleSave}
                  onPress={(deal) => router.push(`/deal/${deal.id}` as Href)}
                />
              );
            }
            return (
              <EventCard
                event={item.event}
                onPress={(event) => router.push(`/event/${event.id}` as Href)}
              />
            );
          }}
          ListHeaderComponent={
            error ? (
              <View style={styles.errorBlock}>
                <Text style={styles.errorText}>{error}</Text>
                <Button
                  label="Retry"
                  onPress={() => {
                    void refreshDeals();
                    void refreshEvents();
                  }}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.stateBlock}>
              <Text style={styles.stateTitle}>
                {error
                  ? "Could not load results"
                  : selectedBrand
                    ? `No deals for ${selectedBrand}`
                    : "No matches"}
              </Text>
              <Text style={styles.stateBody}>
                {error
                  ? error
                  : "Try a different search term or switch All / Deals / Events / Brands."}
              </Text>
            </View>
          }
        />
      )}
      </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: MIN_TAP_TARGET,
    height: SEARCH_FIELD_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    flex: 1,
    height: SEARCH_FIELD_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  body: {
    flex: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  scopeWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  brandChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    maxWidth: "80%",
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  brandChipLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  errorBlock: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
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
