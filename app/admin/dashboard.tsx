import { useRouter, type Href } from "expo-router";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock3,
  FileText,
  History,
  Mail,
  Package,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react-native";
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

import { SettingsGroup } from "@/components/SettingsGroup";
import { StatCard } from "@/components/StatCard";
import { useAdminOverview } from "@/lib/useAdmin";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { metrics, recentScans, isLoading, isRefreshing, error, refresh } =
    useAdminOverview();

  const latestScan = recentScans[0];
  const recentScansSubtitle =
    !latestScan
      ? "No scans yet"
      : `${recentScans.length} recent · last ${formatRelativeTime(latestScan.createdAt)}`;

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
        <Text style={styles.navTitle}>Admin Portal</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dashboard Overview</Text>
          <Text style={styles.sectionSubtitle}>
            Platform health at a glance — moderation and content tools below.
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
              value={metrics.totalDeals}
              icon={<Package color={colors.onBackground} size={18} />}
              onPress={() => router.push("/admin/deals" as Href)}
            />
            <StatCard
              label="Active Deals"
              value={metrics.activeDeals}
              valueColor={colors.primary}
              icon={<CheckCircle2 color={colors.primary} size={18} />}
              onPress={() => router.push("/admin/deals" as Href)}
            />
            <StatCard
              label="Total Users"
              value={metrics.totalUsers}
              icon={<Users color={colors.onBackground} size={18} />}
              onPress={() => router.push("/admin/users" as Href)}
            />
            <StatCard
              label="Total Partners"
              value={metrics.totalPartners}
              icon={<Building2 color={colors.onBackground} size={18} />}
              onPress={() => router.push("/admin/brands" as Href)}
            />
            <StatCard
              label="Pending Verifications"
              value={metrics.pendingVerifications}
              valueColor={colors.warning}
              icon={<ShieldCheck color={colors.warning} size={18} />}
              onPress={() => router.push("/admin/verifications" as Href)}
            />
            <StatCard
              label="Confirmed Redemptions"
              value={metrics.confirmedRedemptions}
              valueColor={colors.primary}
              icon={<BadgeCheck color={colors.primary} size={18} />}
              onPress={() => router.push("/admin/analytics" as Href)}
            />
          </View>
        )}

        <SettingsGroup
          title="Activity"
          rows={[
            {
              key: "recent-scans",
              label: "Recent scans",
              subtitle: isLoading ? "Loading…" : recentScansSubtitle,
              icon: <QrCode color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/analytics" as Href),
            },
          ]}
        />

        <SettingsGroup
          title="Moderation"
          rows={[
            {
              key: "verifications",
              label: "Verifications",
              icon: <ShieldCheck color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/verifications" as Href),
            },
            {
              key: "pending-events",
              label: "Pending Events",
              icon: <ClipboardList color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/pending-events" as Href),
            },
            {
              key: "inquiries",
              label: "Inquiries",
              icon: <Mail color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/inquiries" as Href),
            },
          ]}
        />

        <SettingsGroup
          title="Content"
          rows={[
            {
              key: "deals",
              label: "All Deals",
              icon: <Package color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/deals" as Href),
            },
            {
              key: "finished-deals",
              label: "Finished Deals",
              icon: <History color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/finished-deals" as Href),
            },
            {
              key: "events",
              label: "All Events",
              icon: <CalendarDays color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/events" as Href),
            },
            {
              key: "finished-events",
              label: "Finished Events",
              icon: <Clock3 color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/finished-events" as Href),
            },
            {
              key: "blog",
              label: "Blog Manager",
              icon: <FileText color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/blog" as Href),
            },
          ]}
        />

        <SettingsGroup
          title="System"
          rows={[
            {
              key: "users",
              label: "Users",
              icon: <Users color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/users" as Href),
            },
            {
              key: "brands",
              label: "Brands",
              icon: <Building2 color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/brands" as Href),
            },
            {
              key: "analytics",
              label: "Analytics",
              icon: <BarChart3 color={colors.primary} size={20} />,
              onPress: () => router.push("/admin/analytics" as Href),
            },
          ]}
        />
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
  sectionHeader: {
    gap: spacing.xs,
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
  pressed: {
    opacity: 0.75,
  },
});
