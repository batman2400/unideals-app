import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { DealCard } from "@/components/DealCard";
import { ListSkeleton } from "@/components/ListSkeleton";
import { slugify } from "@/lib/brandPath";
import { partitionDeals } from "@/lib/eventTiming";
import { asRouteId } from "@/lib/routeParams";
import { useDeals } from "@/lib/useDeals";
import { useSavedDeals } from "@/lib/useSavedDeals";
import { colors, spacing } from "@/theme";

export default function BrandHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug: rawSlug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = asRouteId(rawSlug);
  const { deals, isLoading, isRefreshing, error, refresh } = useDeals();
  const { savedIds, isLoading: savedLoading, toggleSave } = useSavedDeals();

  const brandDeals = useMemo(
    () => deals.filter((deal) => slugify(deal.brand) === slug),
    [deals, slug],
  );
  const brandName = brandDeals[0]?.brand ?? null;
  const { live, comingSoon } = useMemo(
    () => partitionDeals(brandDeals),
    [brandDeals],
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingBottom: insets.bottom + spacing.xxl,
      }}
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
        <Text style={styles.kicker}>Partner brand</Text>
        <Text style={styles.title}>
          {brandName || "Brand"} Student Offers
        </Text>
        <Text style={styles.subtitle}>
          {brandName
            ? `Exclusive student discounts from ${brandName} on Uni Deals.`
            : "This brand hub could not be found."}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.pad}>
          <ListSkeleton count={3} />
        </View>
      ) : error ? (
        <View style={styles.pad}>
          <Text style={styles.errorText}>{error}</Text>
          <Button label="Retry" onPress={() => void refresh()} />
        </View>
      ) : !brandName ? (
        <View style={styles.pad}>
          <Text style={styles.emptyTitle}>Brand not found</Text>
          <Text style={styles.emptyBody}>
            That partner is not in the live catalogue yet.
          </Text>
          <Button label="Browse deals" onPress={() => router.replace("/deals" as Href)} />
        </View>
      ) : (
        <View style={styles.list}>
          {live.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              saved={savedIds.has(deal.id)}
              saveDisabled={savedLoading}
              onToggleSave={toggleSave}
              onPress={(item) => router.push(`/deal/${item.id}` as Href)}
            />
          ))}
          {comingSoon.length > 0 ? (
            <>
              <Text style={styles.section}>Coming soon</Text>
              {comingSoon.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  saved={savedIds.has(deal.id)}
                  saveDisabled={savedLoading}
                  onToggleSave={toggleSave}
                  onPress={(item) => router.push(`/deal/${item.id}` as Href)}
                />
              ))}
            </>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.onBackground,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  pad: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  section: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onBackground,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
});
