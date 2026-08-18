import {
  BadgeCheck,
  Eye,
  QrCode,
  Ticket,
} from "lucide-react-native";
import { useCallback } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import {
  getPartnerDealLifecycle,
  type PartnerDealLifecycle,
} from "@/lib/usePartnerDeals";
import { usePartnerDealStats } from "@/lib/usePartnerDealStats";
import { colors, radius, spacing } from "@/theme";
import type { PartnerDealStats } from "@/types/database";

function statusBadgeColors(lifecycle: PartnerDealLifecycle | "paused"): {
  backgroundColor: string;
  color: string;
} {
  switch (lifecycle) {
    case "active":
      return {
        backgroundColor: colors.primaryContainer,
        color: colors.onPrimaryContainer,
      };
    case "scheduled":
      return {
        backgroundColor: colors.infoContainer,
        color: colors.onInfoContainer,
      };
    case "expired":
      return {
        backgroundColor: colors.surfaceContainerHigh,
        color: colors.onSurface,
      };
    case "paused":
      return { backgroundColor: "#fee2e2", color: "#b91c1c" };
    case "pending":
      return { backgroundColor: "#fef3c7", color: "#b45309" };
    case "rejected":
      return { backgroundColor: "#fee2e2", color: "#b91c1c" };
    default:
      return { backgroundColor: "#fef3c7", color: "#b45309" };
  }
}

function resolveDisplayStatus(stat: PartnerDealStats): string {
  if (stat.dealStatus === "paused") return "paused";
  return getPartnerDealLifecycle({
    status: stat.dealStatus,
    startTime: stat.startTime,
    endTime: stat.endTime,
  });
}

function FunnelBar({
  label,
  value,
  pct,
  conversion,
  fillColor,
}: {
  label: string;
  value: number;
  pct: number;
  conversion?: string;
  fillColor: string;
}) {
  const width = Math.max(Math.min(pct, 100), value > 0 ? 3 : 0);

  return (
    <View style={styles.funnelRow}>
      <View style={styles.funnelHeader}>
        <View style={styles.funnelLabelRow}>
          <Text style={styles.funnelLabel}>{label}</Text>
          {conversion ? (
            <Text style={styles.conversionBadge}>{conversion}</Text>
          ) : null}
        </View>
        <Text style={styles.funnelValue}>{value}</Text>
      </View>
      <View style={styles.funnelTrack}>
        <View
          style={[
            styles.funnelFill,
            { width: `${width}%`, backgroundColor: fillColor },
          ]}
        />
      </View>
    </View>
  );
}

function MetricCell({
  label,
  value,
  valueColor = colors.onBackground,
}: {
  label: string;
  value: number;
  valueColor?: string;
}) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function DealStatCard({ stat }: { stat: PartnerDealStats }) {
  const displayStatus = resolveDisplayStatus(stat);
  const badge = statusBadgeColors(
    displayStatus === "paused"
      ? "paused"
      : (displayStatus as PartnerDealLifecycle),
  );
  const isOnline = stat.dealType === "Online";
  const isInStore = stat.dealType === "In-Store";

  return (
    <View style={styles.dealCard}>
      <View style={styles.dealHeader}>
        <View style={styles.dealTitleBlock}>
          <Text style={styles.dealTitle} numberOfLines={2}>
            {stat.dealTitle}
          </Text>
          <Text style={styles.dealType}>{stat.dealType}</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: badge.backgroundColor },
          ]}
        >
          <Text style={[styles.statusText, { color: badge.color }]}>
            {displayStatus}
          </Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        {isOnline ? (
          <>
            <MetricCell label="Reveals" value={stat.totalReveals} />
            <MetricCell label="Copies" value={stat.totalCopies} />
            <MetricCell label="Clicks" value={stat.totalClickThroughs} />
          </>
        ) : null}
        {isInStore ? (
          <>
            <MetricCell label="Tickets" value={stat.totalTicketsGenerated} />
            <MetricCell
              label="Redeemed"
              value={stat.confirmedRedemptions}
              valueColor={colors.primary}
            />
            <MetricCell label="Scans" value={stat.totalScans} />
          </>
        ) : null}
        {!isOnline && !isInStore ? (
          <>
            <MetricCell label="Reveals" value={stat.totalReveals} />
            <MetricCell label="Tickets" value={stat.totalTicketsGenerated} />
            <MetricCell
              label="Redeemed"
              value={stat.confirmedRedemptions}
              valueColor={colors.primary}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

export default function PartnerAnalyticsScreen() {
  const { user } = useAuth();
  const {
    dealStats,
    totals,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = usePartnerDealStats(user?.id);

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const copyConversion =
    totals.totalReveals > 0
      ? `${((totals.totalCopies / totals.totalReveals) * 100).toFixed(1)}% Conv.`
      : undefined;
  const redeemConversion =
    totals.totalTickets > 0
      ? `${((totals.confirmedRedemptions / totals.totalTickets) * 100).toFixed(1)}% Conv.`
      : undefined;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.subheading}>
          Track performance across your deals — reveals, tickets, and
          redemptions.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.statGrid}>
        <StatCard
          label="Code Reveals"
          value={totals.totalReveals}
          icon={<Eye color={colors.onSurfaceVariant} size={18} />}
        />
        <StatCard
          label="Tickets Generated"
          value={totals.totalTickets}
          icon={<Ticket color={colors.primary} size={18} />}
          valueColor={colors.primary}
        />
        <StatCard
          label="Partner Scans"
          value={totals.totalScans}
          icon={<QrCode color={colors.onSurfaceVariant} size={18} />}
        />
        <StatCard
          label="Redemptions"
          value={totals.confirmedRedemptions}
          icon={<BadgeCheck color={colors.primary} size={18} />}
          valueColor={colors.primary}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Engagement Funnel</Text>
        <FunnelBar
          label="Code Reveals (Online)"
          value={totals.totalReveals}
          pct={100}
          fillColor={colors.surfaceContainerHigh}
        />
        <FunnelBar
          label="Code Copies (Online)"
          value={totals.totalCopies}
          pct={
            totals.totalReveals > 0
              ? (totals.totalCopies / totals.totalReveals) * 100
              : 0
          }
          conversion={copyConversion}
          fillColor={`${colors.primary}80`}
        />
        <FunnelBar
          label="Tickets Generated (In-Store)"
          value={totals.totalTickets}
          pct={100}
          fillColor={colors.surfaceContainerHigh}
        />
        <FunnelBar
          label="Confirmed Redemptions (In-Store)"
          value={totals.confirmedRedemptions}
          pct={
            totals.totalTickets > 0
              ? (totals.confirmedRedemptions / totals.totalTickets) * 100
              : 0
          }
          conversion={redeemConversion}
          fillColor={colors.primary}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Performance by Deal</Text>
        {dealStats.length === 0 ? (
          <Text style={styles.emptyText}>No deal analytics yet.</Text>
        ) : (
          <View style={styles.dealList}>
            {dealStats.map((stat) => (
              <DealStatCard key={stat.dealId} stat={stat} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  intro: {
    gap: spacing.xs,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.onBackground,
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onErrorContainer,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onBackground,
  },
  funnelRow: {
    gap: spacing.sm,
  },
  funnelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  funnelLabelRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  funnelLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onBackground,
  },
  conversionBadge: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.primary,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  funnelValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    fontVariant: ["tabular-nums"],
  },
  funnelTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainerLow,
    overflow: "hidden",
  },
  funnelFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  emptyText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  dealList: {
    gap: spacing.md,
  },
  dealCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  dealHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  dealTitleBlock: {
    flex: 1,
    gap: 2,
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onBackground,
  },
  dealType: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricCell: {
    minWidth: "28%",
    flexGrow: 1,
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
