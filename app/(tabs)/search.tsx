import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { ChevronLeft, Search } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandResultRow } from "@/components/BrandResultRow";
import { useKeyboardInset } from "@/components/KeyboardForm";
import { Button } from "@/components/Button";
import { DealCard } from "@/components/DealCard";
import { EventCard } from "@/components/EventCard";
import { ListSkeleton } from "@/components/ListSkeleton";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  useTabBarMotion,
  type SearchScope,
} from "@/context/TabBarMotionContext";
import { brandHubPath, resolveBrandExplore } from "@/lib/brandPath";
import {
  partitionDeals,
  partitionEvents,
  splitLiveEvents,
} from "@/lib/eventTiming";
import {
  SEARCH_FIELD_HEIGHT,
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
import { filterPerks, type StudentPerk } from "@/lib/studentPerks";
import { useStudentPerks } from "@/lib/useStudentPerks";
import { PerkCard } from "@/components/PerkCard";
import { useSavedDeals } from "@/lib/useSavedDeals";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import type { CampusEvent, Deal } from "@/types/database";

type SearchItem =
  | { kind: "header"; id: string; title: string }
  | { kind: "brand"; id: string; brand: DealBrandSummary }
  | { kind: "deal"; id: string; deal: Deal }
  | { kind: "event"; id: string; event: CampusEvent }
  | { kind: "perk"; id: string; perk: StudentPerk };

function asSearchScope(param: string | string[] | undefined): SearchScope {
  const value = Array.isArray(param) ? param[0] : param;
  if (
    value === "deals" ||
    value === "events" ||
    value === "brands" ||
    value === "perks"
  ) {
    return value;
  }
  return "all";
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    scope?: string | string[];
    q?: string | string[];
  }>();
  const { leaveSearch } = useTabBarMotion();
  const inputRef = useRef<TextInput>(null);

  const { deals, isLoading: dealsLoading, isRefreshing: dealsRefreshing, error: dealsError, refresh: refreshDeals } =
    useDeals();
  const { events, isLoading: eventsLoading, isRefreshing: eventsRefreshing, error: eventsError, refresh: refreshEvents } =
    useEvents();
  const { savedIds, isLoading: savedLoading, toggleSave } = useSavedDeals();
  const {
    perks,
    isLoading: perksLoading,
    isRefreshing: perksRefreshing,
    refresh: refreshPerks,
  } = useStudentPerks();

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>(() =>
    asSearchScope(params.scope),
  );

  useEffect(() => {
    setScope(asSearchScope(params.scope));
  }, [params.scope]);

  useEffect(() => {
    const raw = Array.isArray(params.q) ? params.q[0] : params.q;
    if (raw !== undefined) setQuery(raw);
  }, [params.q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

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

    const matchedBrands =
      scope === "deals" || scope === "events" || scope === "perks"
        ? []
        : filterDealBrands(brands, query);
    const matchedDeals =
      scope === "events" || scope === "brands" || scope === "perks"
        ? []
        : filterDeals(dealPool, query);
    const matchedEvents =
      scope === "deals" || scope === "brands" || scope === "perks"
        ? []
        : filterEvents(eventPool, query);
    const matchedPerks =
      scope === "deals" || scope === "events" || scope === "brands"
        ? []
        : filterPerks(perks, query);

    const brandSlice =
      trimmed || scope === "brands"
        ? matchedBrands
        : matchedBrands.slice(0, 6);
    const dealSlice = trimmed ? matchedDeals : matchedDeals.slice(0, 8);
    const eventSlice = trimmed ? matchedEvents : matchedEvents.slice(0, 6);
    const perkSlice =
      trimmed || scope === "perks" ? matchedPerks : matchedPerks.slice(0, 6);

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
    if (perkSlice.length > 0) {
      next.push({
        kind: "header",
        id: "header-perks",
        title: trimmed || scope === "perks" ? "Global perks" : "Suggested perks",
      });
      for (const perk of perkSlice) {
        next.push({ kind: "perk", id: `perk-${perk.id}`, perk });
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
  }, [brands, dealPool, eventPool, perks, query, scope]);

  const keyboardInset = useKeyboardInset();
  const isLoading =
    dealsLoading || eventsLoading || (scope === "perks" && perksLoading);
  const isRefreshing = dealsRefreshing || eventsRefreshing || perksRefreshing;
  const error = dealsError || eventsError;

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => leaveSearch()}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.pressed,
          ]}
        >
          <ChevronLeft color={colors.primary} size={26} />
        </Pressable>

        <View style={styles.field}>
          <Search color={colors.onSurfaceVariant} size={18} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={
              scope === "brands"
                ? "e.g. Spa Ceylon"
                : scope === "perks"
                  ? "Search global student perks"
                  : "Search deals, events, and brands"
            }
            placeholderTextColor={colors.inverseOnSurface}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={false}
            editable
            returnKeyType="search"
            showSoftInputOnFocus
            blurOnSubmit={false}
            onSubmitEditing={() => {
              const target = resolveBrandExplore(
                query,
                brands.map((brand) => brand.name),
              );
              if (target.kind === "hub") {
                router.push(`/brand/${target.slug}` as Href);
              }
            }}
          />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.scopeWrap}>
          <SegmentedControl
            value={scope}
            onChange={(next) => {
              setScope(next);
              router.setParams({ scope: next });
            }}
            options={[
              { value: "all", label: "All" },
              { value: "deals", label: "Deals" },
              { value: "events", label: "Events" },
              { value: "brands", label: "Brands" },
              { value: "perks", label: "Perks" },
            ]}
          />
        </View>

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
            {
              paddingBottom:
                keyboardInset > 0
                  ? keyboardInset + 24
                  : floatingTabBarScrollPadding(insets.bottom),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void refreshDeals();
                void refreshEvents();
                void refreshPerks();
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
                  onPress={(brand) =>
                    router.push(brandHubPath(brand.name) as Href)
                  }
                />
              );
            }
            if (item.kind === "perk") {
              return (
                <PerkCard
                  perk={item.perk}
                  onPress={() => router.push(`/perk/${item.perk.id}` as Href)}
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
                    void refreshPerks();
                  }}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.stateBlock}>
              <Text style={styles.stateTitle}>
                {error ? "Could not load results" : "No matches"}
              </Text>
              <Text style={styles.stateBody}>
                {error
                  ? error
                  : "Try a different search term or switch All / Deals / Events / Brands / Perks."}
              </Text>
            </View>
          }
        />
      )}
      </View>
      </View>
    </View>
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
