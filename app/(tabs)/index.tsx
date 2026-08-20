import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { Bookmark } from "lucide-react-native";
import { useMemo, type ReactNode } from "react";
import {
  Dimensions,
  ImageBackground,
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
import { SaveDealButton } from "@/components/DealCard";
import { ListSkeleton } from "@/components/ListSkeleton";
import { useTabBarCollapseScrollHandler } from "@/context/TabBarMotionContext";
import {
  formatEventWhen,
  formatLaunchRelative,
  partitionDeals,
  partitionEvents,
  splitLiveEvents,
} from "@/lib/eventTiming";
import { useDeals } from "@/lib/useDeals";
import { useEvents } from "@/lib/useEvents";
import { useSavedDeals } from "@/lib/useSavedDeals";
import { floatingTabBarScrollPadding } from "@/lib/tabBar";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import type { CampusEvent, Deal } from "@/types/database";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_CARD_WIDTH = SCREEN_WIDTH * 0.62;
const CARD_RADIUS = 16;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onScroll = useTabBarCollapseScrollHandler();
  const {
    deals,
    isLoading: dealsLoading,
    isRefreshing: dealsRefreshing,
    error: dealsError,
    refresh: refreshDeals,
  } = useDeals();
  const {
    events,
    isLoading: eventsLoading,
    isRefreshing: eventsRefreshing,
    error: eventsError,
    refresh: refreshEvents,
  } = useEvents();
  const { savedIds, isLoading: savedLoading, toggleSave } = useSavedDeals();

  const { live: liveDeals, comingSoon: comingSoonDeals } = useMemo(
    () => partitionDeals(deals),
    [deals],
  );
  const trendingDeals = liveDeals.slice(0, 8);
  const comingSoonDealsPreview = comingSoonDeals.slice(0, 6);

  const { live: liveEvents } = useMemo(
    () => partitionEvents(events),
    [events],
  );
  const { active: activeEvents } = useMemo(
    () => splitLiveEvents(liveEvents),
    [liveEvents],
  );
  const trendingEvents = activeEvents.slice(0, 6);

  const isRefreshing = dealsRefreshing || eventsRefreshing;

  const refresh = async () => {
    await Promise.all([refreshDeals(), refreshEvents()]);
  };

  return (
    <Animated.ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingBottom: floatingTabBarScrollPadding(insets.bottom),
      }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refresh()}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>
            Uni<Text style={styles.brandAccent}>Deals</Text>
          </Text>
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
        <Text style={styles.subtitle}>
          Student perks and campus events, in one place.
        </Text>
      </View>

      {dealsError ? (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText}>{dealsError}</Text>
          <Button label="Retry" onPress={() => void refreshDeals()} />
        </View>
      ) : null}

      <SectionHeader
        title="Trending Deals"
        actionLabel="View all"
        onAction={() => router.push("/deals" as Href)}
      />

      {dealsLoading ? (
        <ListSkeleton variant="carousel" count={3} />
      ) : trendingDeals.length > 0 ? (
        <HeroCarousel>
          {trendingDeals.map((item) => (
            <HeroDealCard
              key={`hero-deal-${item.id}`}
              deal={item}
              saved={savedIds.has(item.id)}
              saveDisabled={savedLoading}
              onToggleSave={() => void toggleSave(item.id)}
              onPress={() => router.push(`/deal/${item.id}` as Href)}
            />
          ))}
        </HeroCarousel>
      ) : !dealsLoading ? (
        <Text style={styles.emptyInline}>No live deals available yet.</Text>
      ) : null}

      {eventsError ? (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText}>{eventsError}</Text>
          <Button label="Retry" onPress={() => void refreshEvents()} />
        </View>
      ) : null}

      <SectionHeader
        title="Trending Events"
        actionLabel="View all"
        onAction={() => router.push("/events" as Href)}
      />

      {eventsLoading ? (
        <ListSkeleton variant="carousel" count={3} />
      ) : trendingEvents.length > 0 ? (
        <HeroCarousel>
          {trendingEvents.map((event) => (
            <HeroEventCard
              key={`hero-event-${event.id}`}
              event={event}
              onPress={() => router.push(`/event/${event.id}` as Href)}
            />
          ))}
        </HeroCarousel>
      ) : !eventsLoading ? (
        <Text style={styles.emptyInline}>No upcoming events right now.</Text>
      ) : null}

      <SectionHeader
        title="Coming Soon Deals"
        actionLabel="View all"
        onAction={() =>
          router.push({
            pathname: "/deals",
            params: { schedule: "coming_soon" },
          } as Href)
        }
      />
      {dealsLoading ? (
        <ListSkeleton variant="carousel" count={3} />
      ) : comingSoonDealsPreview.length > 0 ? (
        <HeroCarousel>
          {comingSoonDealsPreview.map((item) => (
            <HeroDealCard
              key={`soon-deal-${item.id}`}
              deal={item}
              comingSoon
              saved={savedIds.has(item.id)}
              saveDisabled={savedLoading}
              onToggleSave={() => void toggleSave(item.id)}
              onPress={() => router.push(`/deal/${item.id}` as Href)}
            />
          ))}
        </HeroCarousel>
      ) : (
        <Text style={styles.emptyInline}>
          No scheduled deals yet — they appear here until go-live.
        </Text>
      )}
    </Animated.ScrollView>
  );
}

function HeroCarousel({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.heroList}
      nestedScrollEnabled
    >
      {children}
    </ScrollView>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable onPress={onAction} hitSlop={8}>
        <Text style={styles.sectionAction}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function HeroDealCard({
  deal,
  onPress,
  comingSoon = false,
  saved = false,
  saveDisabled = false,
  onToggleSave,
}: {
  deal: Deal;
  onPress: () => void;
  comingSoon?: boolean;
  saved?: boolean;
  saveDisabled?: boolean;
  onToggleSave?: () => void;
}) {
  const launchLabel = deal.startTime
    ? formatLaunchRelative(deal.startTime)
    : "Coming soon";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deal.discount} at ${deal.brand}`}
      onPress={onPress}
      style={({ pressed }) => [styles.heroCard, pressed && styles.pressed]}
    >
      <ImageBackground
        source={deal.imageUrl ? { uri: deal.imageUrl } : undefined}
        style={styles.heroImage}
        imageStyle={styles.heroImageInner}
      >
        {!deal.imageUrl ? (
          <View style={styles.heroFallback}>
            <Text style={styles.heroFallbackText}>{deal.brand}</Text>
          </View>
        ) : null}
        <View style={styles.heroTopLeft}>
          <View
            style={[
              styles.floatingBadge,
              comingSoon && styles.comingSoonBadge,
            ]}
          >
            <Text style={styles.floatingBadgeText}>
              {comingSoon
                ? launchLabel.toUpperCase()
                : deal.type === "Online"
                  ? "ONLINE"
                  : "IN-STORE"}
            </Text>
          </View>
        </View>
        {onToggleSave ? (
          <View style={styles.heroTopRight}>
            <SaveDealButton
              saved={saved}
              disabled={saveDisabled}
              variant="overlay"
              onPress={onToggleSave}
            />
          </View>
        ) : null}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          style={styles.heroGradient}
          pointerEvents="none"
        />
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroBrand} numberOfLines={1}>
            {deal.brand.toUpperCase()}
          </Text>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {deal.discount}
          </Text>
          <Text style={styles.heroSubtitle} numberOfLines={1}>
            {comingSoon ? launchLabel : deal.title}
          </Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function HeroEventCard({
  event,
  onPress,
}: {
  event: CampusEvent;
  onPress: () => void;
}) {
  const eyebrow =
    event.universityName?.trim() ||
    event.category?.replace(/_/g, " ") ||
    "Campus event";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={event.title}
      onPress={onPress}
      style={({ pressed }) => [styles.heroCard, pressed && styles.pressed]}
    >
      <ImageBackground
        source={
          event.coverImageUrl ? { uri: event.coverImageUrl } : undefined
        }
        style={styles.heroImage}
        imageStyle={styles.heroImageInner}
      >
        {!event.coverImageUrl ? (
          <View style={styles.heroFallback}>
            <Text style={styles.heroFallbackText} numberOfLines={2}>
              {event.title}
            </Text>
          </View>
        ) : null}
        <View style={styles.heroTopLeft}>
          <View style={styles.floatingBadge}>
            <Text style={styles.floatingBadgeText}>EVENT</Text>
          </View>
        </View>
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          style={styles.heroGradient}
          pointerEvents="none"
        />
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroBrand} numberOfLines={1}>
            {eyebrow.toUpperCase()}
          </Text>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={styles.heroSubtitle} numberOfLines={1}>
            {formatEventWhen(event)}
          </Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
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
  brand: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.onBackground,
  },
  brandAccent: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  errorBlock: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.onBackground,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  heroList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  heroCard: {
    width: HERO_CARD_WIDTH,
  },
  pressed: {
    opacity: 0.9,
  },
  heroImage: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainer,
  },
  heroImageInner: {
    borderRadius: CARD_RADIUS,
  },
  heroFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.lg,
  },
  heroFallbackText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
    textAlign: "center",
  },
  heroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  heroTopLeft: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 2,
  },
  heroTopRight: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
  },
  floatingBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  comingSoonBadge: {
    backgroundColor: colors.info,
  },
  floatingBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
  },
  heroTextWrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: 2,
  },
  heroBrand: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.85)",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.white,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  emptyInline: {
    paddingHorizontal: spacing.lg,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});
