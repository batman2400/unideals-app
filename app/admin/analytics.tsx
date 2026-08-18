import {
  BadgeCheck,
  Eye,
  QrCode,
  Ticket,
} from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Select } from "@/components/Select";
import { StatCard } from "@/components/StatCard";
import {
  useAdminAnalytics,
  type ShopAnalytics,
} from "@/lib/useAdminAnalytics";
import { colors, radius, spacing } from "@/theme";
import type { AdminDeal, AdminRecentScan } from "@/types/database";

function FunnelBar({
  label,
  value,
  pct,
  fillColor,
}: {
  label: string;
  value: number;
  pct: number;
  fillColor: string;
}) {
  const width = Math.max(Math.min(pct, 100), value > 0 ? 3 : 0);
  return (
    <View style={styles.funnelRow}>
      <View style={styles.funnelHeader}>
        <Text style={styles.funnelLabel}>{label}</Text>
        <Text style={styles.funnelValue}>
          {value} ({Math.min(pct, 100).toFixed(1)}%)
        </Text>
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

function ShopRow({ row }: { row: ShopAnalytics }) {
  const rate =
    row.totalScans > 0
      ? ((row.confirmedRedemptions / row.totalScans) * 100).toFixed(1)
      : "0.0";
  return (
    <View style={styles.perfCard}>
      <Text style={styles.perfTitle}>{row.brand}</Text>
      <View style={styles.perfGrid}>
        <Text style={styles.perfMeta}>Scans {row.totalScans}</Text>
        <Text style={[styles.perfMeta, { color: colors.primary }]}>
          Valid {row.validScans}
        </Text>
        <Text style={[styles.perfMeta, { color: colors.error }]}>
          Failed {row.failedScans}
        </Text>
        <Text style={styles.perfMeta}>
          Confirmed {row.confirmedRedemptions}
        </Text>
        <Text style={styles.perfMeta}>Conv {rate}%</Text>
      </View>
    </View>
  );
}

function DealRow({ deal }: { deal: AdminDeal }) {
  const isOnline = deal.type === "Online";
  return (
    <View style={styles.perfCard}>
      <Text style={styles.perfTitle} numberOfLines={2}>
        {deal.title}
      </Text>
      <Text style={styles.perfSub}>{deal.type}</Text>
      <View style={styles.perfGrid}>
        {isOnline ? (
          <Text style={styles.perfMeta}>Reveals {deal.totalReveals}</Text>
        ) : (
          <>
            <Text style={styles.perfMeta}>
              Tickets {deal.totalTicketsGenerated}
            </Text>
            <Text style={[styles.perfMeta, { color: colors.primary }]}>
              Redeemed {deal.totalTicketsRedeemed}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

function ScanRow({ scan }: { scan: AdminRecentScan }) {
  return (
    <View style={styles.scanRow}>
      <View style={styles.scanBody}>
        <Text style={styles.scanTitle} numberOfLines={1}>
          {scan.dealTitle || scan.brand || "Unknown deal"}
        </Text>
        <Text style={styles.scanMeta} numberOfLines={1}>
          {[scan.brand, scan.scannedCode ? `Code ${scan.scannedCode}` : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <Text style={styles.scanTime}>
        {new Date(scan.createdAt).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </Text>
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const {
    filteredDeals,
    filteredShops,
    recentScans,
    brandOptions,
    selectedBrand,
    setSelectedBrand,
    totals,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useAdminAnalytics();

  const isGlobal = selectedBrand === "All Brands";
  const brandSelectOptions = brandOptions.map((value) => ({
    value,
    label: value,
  }));

  const funnelBase = Math.max(totals.reveals, totals.tickets, 1);

  if (isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      data={
        (isGlobal ? filteredShops : filteredDeals) as Array<
          ShopAnalytics | AdminDeal
        >
      }
      keyExtractor={(item) =>
        "totalScans" in item ? item.brand : String(item.id)
      }
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refresh()}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <Text style={styles.subtitle}>
            Redemption metrics and performance by brand or deal.
          </Text>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Select
            label="Brand filter"
            value={selectedBrand}
            options={brandSelectOptions}
            onChange={setSelectedBrand}
          />

          <View style={styles.statGrid}>
            <StatCard
              label="Code Reveals"
              value={totals.reveals}
              icon={<Eye color={colors.onBackground} size={18} />}
            />
            <StatCard
              label="Tickets Generated"
              value={totals.tickets}
              valueColor={colors.primary}
              icon={<Ticket color={colors.primary} size={18} />}
            />
            <StatCard
              label="Total Scans"
              value={totals.scans}
              icon={<QrCode color={colors.onBackground} size={18} />}
            />
            <StatCard
              label="Confirmed Redemptions"
              value={totals.confirmed}
              valueColor={colors.primary}
              icon={<BadgeCheck color={colors.primary} size={18} />}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Engagement Funnel{" "}
              {isGlobal ? "(All Brands)" : `(${selectedBrand})`}
            </Text>
            <FunnelBar
              label="Code Reveals (Online)"
              value={totals.reveals}
              pct={100}
              fillColor={colors.outlineVariant}
            />
            <FunnelBar
              label="Tickets Generated (In-Store)"
              value={totals.tickets}
              pct={
                totals.reveals > 0
                  ? (totals.tickets / Math.max(totals.reveals, 1)) * 100
                  : totals.tickets > 0
                    ? 100
                    : 0
              }
              fillColor={colors.primaryContainer}
            />
            <FunnelBar
              label="Partner Scans"
              value={totals.scans}
              pct={(totals.scans / funnelBase) * 100}
              fillColor={colors.primary}
            />
            <FunnelBar
              label="Confirmed Redemptions"
              value={totals.confirmed}
              pct={
                totals.scans > 0
                  ? (totals.confirmed / totals.scans) * 100
                  : totals.confirmed > 0
                    ? 100
                    : 0
              }
              fillColor={colors.onPrimaryContainer}
            />
          </View>

          <Text style={styles.listHeading}>
            {isGlobal
              ? "Performance by Brand"
              : `Deal Performance: ${selectedBrand}`}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyBody}>
            {isGlobal ? "No brand analytics yet." : "No deals for this brand."}
          </Text>
        </View>
      }
      renderItem={({ item }) =>
        "totalScans" in item ? (
          <ShopRow row={item} />
        ) : (
          <DealRow deal={item} />
        )
      }
      ListFooterComponent={
        <View style={styles.footerBlock}>
          <Text style={styles.listHeading}>Recent Scan Activity</Text>
          {recentScans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyBody}>No scan activity yet.</Text>
            </View>
          ) : (
            <View style={styles.sectionCard}>
              {recentScans.map((scan, index) => (
                <View key={scan.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ScanRow scan={scan} />
                </View>
              ))}
            </View>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerBlock: {
    gap: spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "#fef3c7",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b45309",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  sectionCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onBackground,
  },
  funnelRow: {
    gap: spacing.xs,
  },
  funnelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  funnelLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.onBackground,
  },
  funnelValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
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
  listHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onBackground,
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
  },
  emptyBody: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  perfCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  perfTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onBackground,
  },
  perfSub: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  perfGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  perfMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurface,
  },
  footerBlock: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  scanRow: {
    gap: spacing.xs,
  },
  scanBody: {
    gap: 2,
  },
  scanTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.onBackground,
  },
  scanMeta: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  scanTime: {
    fontSize: 12,
    color: colors.outline,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.sm,
  },
});
