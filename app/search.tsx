import { useLocalSearchParams, useNavigation, useRouter, type Href } from "expo-router";
import { ChevronLeft, Search } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { SEARCH_FIELD_HEIGHT } from "@/lib/tabBar";
import { filterDeals, useDeals } from "@/lib/useDeals";
import { filterEvents, useEvents } from "@/lib/useEvents";
import { useSavedDeals } from "@/lib/useSavedDeals";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import type { CampusEvent, Deal } from "@/types/database";

type SearchItem =
  | { kind: "header"; id: string; title: string }
  | { kind: "deal"; id: string; deal: Deal }
  | { kind: "event"; id: string; event: CampusEvent };

function asSearchScope(param: string | string[] | undefined): SearchScope {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === "deals" || value === "events") return value;
  return "all";
}

export default function SearchScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scope?: string | string[] }>();
  const { searchFieldVisible, closeSearch, morphProgress, chipHidden } =
    useTabBarMotion();
  const allowRemoveRef = useRef(false);

  const { deals, isLoading: dealsLoading, isRefreshing: dealsRefreshing, error: dealsError, refresh: refreshDeals } =
    useDeals();
  const { events, isLoading: eventsLoading, isRefreshing: eventsRefreshing, error: eventsError, refresh: refreshEvents } =
    useEvents();
  const { savedIds, isLoading: savedLoading, toggleSave } = useSavedDeals();

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>(() =>
    asSearchScope(params.scope),
  );

  useEffect(() => {
    setScope(asSearchScope(params.scope));
  }, [params.scope]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowRemoveRef.current) return;
      const type = event.data.action.type;
      if (type !== "POP" && type !== "GO_BACK" && type !== "POP_TO_TOP") {
        return;
      }
      if (morphProgress.value < 0.05 && chipHidden.value === 0) {
        return;
      }
      event.preventDefault();
      closeSearch(() => {
        allowRemoveRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });
    return unsubscribe;
  }, [chipHidden, closeSearch, morphProgress, navigation]);

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

  const items = useMemo(() => {
    const dealPool = [...liveDeals, ...comingSoonDeals];
    const eventPool = [...activeEvents, ...comingSoonEvents];
    const trimmed = query.trim();
    const matchedDeals =
      scope === "events" ? [] : filterDeals(dealPool, query);
    const matchedEvents =
      scope === "deals" ? [] : filterEvents(eventPool, query);

    const dealSlice = trimmed ? matchedDeals : matchedDeals.slice(0, 8);
    const eventSlice = trimmed ? matchedEvents : matchedEvents.slice(0, 6);

    const next: SearchItem[] = [];
    if (dealSlice.length > 0 && scope !== "events") {
      next.push({
        kind: "header",
        id: "header-deals",
        title: trimmed ? "Deals" : "Suggested deals",
      });
      for (const deal of dealSlice) {
        next.push({ kind: "deal", id: `deal-${deal.id}`, deal });
      }
    }
    if (eventSlice.length > 0 && scope !== "deals") {
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
  }, [
    activeEvents,
    comingSoonDeals,
    comingSoonEvents,
    liveDeals,
    query,
    scope,
  ]);

  const isLoading = dealsLoading || eventsLoading;
  const isRefreshing = dealsRefreshing || eventsRefreshing;
  const error = dealsError || eventsError;

  const goBack = () => {
    if (router.canGoBack()) router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={({ pressed }) => [
            styles.backBtn,
            !searchFieldVisible && styles.backHidden,
            pressed && styles.pressed,
          ]}
        >
          <ChevronLeft color={colors.primary} size={26} />
        </Pressable>

        <View
          style={[styles.field, !searchFieldVisible && styles.fieldHidden]}
        >
          <Search color={colors.onSurfaceVariant} size={18} />
          {searchFieldVisible ? (
            <TextInput
              style={styles.input}
              placeholder="Search deals and events"
              placeholderTextColor={colors.inverseOnSurface}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="search"
            />
          ) : (
            <View style={styles.input} />
          )}
        </View>
      </View>

      <View style={styles.scopeWrap}>
        <SegmentedControl
          value={scope}
          onChange={setScope}
          options={[
            { value: "all", label: "All" },
            { value: "deals", label: "Deals" },
            { value: "events", label: "Events" },
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
          contentContainerStyle={styles.listContent}
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
                {error ? "Could not load results" : "No matches"}
              </Text>
              <Text style={styles.stateBody}>
                {error
                  ? error
                  : "Try a different search term or switch All / Deals / Events."}
              </Text>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
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
  backHidden: {
    opacity: 0,
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
  fieldHidden: {
    opacity: 0,
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
    paddingBottom: spacing.xxl,
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
