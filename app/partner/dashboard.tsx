import { useRouter, type Href } from "expo-router";
import {
  BadgeCheck,
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  History,
  Package,
  PlusCircle,
  QrCode,
  Store,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionTile } from "@/components/ActionTile";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { usePartnerBrand } from "@/lib/usePartnerBrand";
import { usePartnerDeals } from "@/lib/usePartnerDeals";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

export default function PartnerDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    brandId,
    brandName,
    isLoading: brandLoading,
    error: brandError,
    refresh: refreshBrand,
  } = usePartnerBrand(user?.id);

  const {
    metrics,
    isLoading: dealsLoading,
    isRefreshing,
    error: dealsError,
    refresh: refreshDeals,
  } = usePartnerDeals(brandId, user?.id);

  const [redemptions, setRedemptions] = useState(0);
  const [redemptionsError, setRedemptionsError] = useState<string | null>(null);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  const loadRedemptions = useCallback(async () => {
    if (!user?.id) {
      setRedemptions(0);
      setRedemptionsError(null);
      return;
    }

    setRedemptionsLoading(true);
    const { count, error } = await supabase
      .from("confirmed_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", user.id);

    if (error) {
      setRedemptionsError(
        toErrorMessage(error, "Could not load redemption count."),
      );
      setRedemptions(0);
    } else {
      setRedemptionsError(null);
      setRedemptions(count ?? 0);
    }
    setRedemptionsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadRedemptions();
  }, [loadRedemptions]);

  const onRefresh = useCallback(async () => {
    await refreshBrand();
    await refreshDeals();
    await loadRedemptions();
  }, [refreshBrand, refreshDeals, loadRedemptions]);

  const isLoading = brandLoading || dealsLoading;
  const error = brandError ?? dealsError ?? redemptionsError;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Profile"
          onPress={() => router.replace("/profile")}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ChevronLeft color={colors.primary} size={22} />
          <Text style={styles.backLabel}>Profile</Text>
        </Pressable>
        <Text style={styles.navTitle}>Partner Portal</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || redemptionsLoading}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
          />
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Scanner"
          onPress={() => router.push("/partner/scanner" as Href)}
          style={({ pressed }) => [
            styles.heroButton,
            pressed && styles.heroPressed,
          ]}
        >
          <QrCode color={colors.onPrimary} size={28} />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Open Scanner</Text>
            <Text style={styles.heroSubtitle}>
              Validate in-store tickets at the register
            </Text>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dashboard</Text>
          <Text style={styles.sectionSubtitle}>
            {brandName
              ? `Overview for ${brandName}`
              : "Set up your brand by creating your first deal."}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <View style={styles.statGrid}>
            <StatCard
              label="Total Deals"
              value={metrics.total}
              icon={<Package color={colors.onBackground} size={18} />}
              onPress={() => router.push("/partner/deals" as Href)}
            />
            <StatCard
              label="Active Deals"
              value={metrics.active}
              valueColor={colors.primary}
              icon={<CheckCircle2 color={colors.primary} size={18} />}
              onPress={() => router.push("/partner/deals" as Href)}
            />
            <StatCard
              label="Scheduled"
              value={metrics.scheduled}
              valueColor={colors.info}
              icon={<Clock3 color={colors.info} size={18} />}
              onPress={() => router.push("/partner/deals" as Href)}
            />
            <StatCard
              label="Expired Deals"
              value={metrics.expired}
              valueColor={colors.onSurfaceVariant}
              icon={<History color={colors.onSurfaceVariant} size={18} />}
              onPress={() => router.push("/partner/deals" as Href)}
            />
            <StatCard
              label="Redemptions"
              value={redemptions}
              valueColor={colors.primary}
              icon={<BadgeCheck color={colors.primary} size={18} />}
              onPress={() => router.push("/partner/analytics" as Href)}
            />
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.actionGrid}>
          <ActionTile
            label="My Deals"
            icon={<Package color={colors.onPrimaryContainer} size={24} />}
            onPress={() => router.push("/partner/deals" as Href)}
          />
          <ActionTile
            label="Create Deal"
            icon={<PlusCircle color={colors.onPrimaryContainer} size={24} />}
            onPress={() => router.push("/create-deal" as Href)}
          />
          <ActionTile
            label="Create Event"
            icon={<CalendarPlus color={colors.onPrimaryContainer} size={24} />}
            onPress={() => router.push("/create-event" as Href)}
          />
          <ActionTile
            label="Analytics"
            icon={<BarChart3 color={colors.onPrimaryContainer} size={24} />}
            onPress={() => router.push("/partner/analytics" as Href)}
          />
          <ActionTile
            label="Brand Profile"
            icon={<Store color={colors.onPrimaryContainer} size={24} />}
            onPress={() => router.push("/partner/brand" as Href)}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    minHeight: MIN_TAP_TARGET + 8,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    minWidth: 88,
    minHeight: MIN_TAP_TARGET,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onBackground,
  },
  navSpacer: {
    minWidth: 88,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  heroButton: {
    minHeight: MIN_TAP_TARGET * 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  heroPressed: {
    opacity: 0.9,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.primaryContainer,
  },
  sectionHeader: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.onBackground,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  errorBox: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.errorContainer,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onErrorContainer,
  },
  loadingBlock: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
});
