import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import {
  ArrowDown,
  BadgeCheck,
  Copy,
  Minus,
  Search,
  UserPlus,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Select } from "@/components/Select";
import {
  useAdminUsers,
  type AdminUserRoleFilter,
} from "@/lib/useAdmin";
import { colors, radius, spacing } from "@/theme";
import type { AdminUser } from "@/types/database";

const ROLE_FILTERS: readonly {
  value: AdminUserRoleFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "student", label: "Students" },
  { value: "partner", label: "Partners" },
  { value: "admin", label: "Admins" },
];

function roleBadgeColors(role: string): {
  backgroundColor: string;
  color: string;
} {
  switch (role) {
    case "admin":
      return { backgroundColor: "#f3e8ff", color: "#7e22ce" };
    case "partner":
      return {
        backgroundColor: colors.primaryContainer,
        color: colors.onPrimaryContainer,
      };
    default:
      return { backgroundColor: "#dbeafe", color: "#1d4ed8" };
  }
}

function formatJoined(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function UserCard({
  user,
  acting,
  onPromote,
  onDemote,
}: {
  user: AdminUser;
  acting: boolean;
  onPromote: () => void;
  onDemote: () => void;
}) {
  const badge = roleBadgeColors(user.role);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.emailRow}>
          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy email"
            onPress={() => {
              void Clipboard.setStringAsync(user.email);
            }}
            hitSlop={8}
          >
            <Copy color={colors.outline} size={14} />
          </Pressable>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {user.role}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Verified</Text>
          {user.isVerified ? (
            <BadgeCheck color={colors.primary} size={18} />
          ) : (
            <Minus color={colors.outlineVariant} size={18} />
          )}
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Brand</Text>
          <Text style={styles.metaValue}>{user.brandName || "—"}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Joined</Text>
          <Text style={styles.metaValue}>{formatJoined(user.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {user.role === "partner" ? (
          <Pressable
            accessibilityRole="button"
            disabled={acting}
            onPress={onDemote}
            style={({ pressed }) => [
              styles.actionChip,
              styles.demoteChip,
              (pressed || acting) && styles.pressed,
            ]}
          >
            {acting ? (
              <ActivityIndicator color="#b45309" size="small" />
            ) : (
              <>
                <ArrowDown color="#b45309" size={14} />
                <Text style={styles.demoteLabel}>Demote</Text>
              </>
            )}
          </Pressable>
        ) : null}
        {user.role === "student" ? (
          <Pressable
            accessibilityRole="button"
            disabled={acting}
            onPress={onPromote}
            style={({ pressed }) => [
              styles.actionChip,
              styles.promoteChip,
              (pressed || acting) && styles.pressed,
            ]}
          >
            <UserPlus color={colors.onPrimaryContainer} size={14} />
            <Text style={styles.promoteLabel}>Promote</Text>
          </Pressable>
        ) : null}
        {user.role === "admin" ? (
          <Text style={styles.protected}>Protected</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function AdminUsersScreen() {
  const params = useLocalSearchParams<{ role?: string | string[] }>();
  const roleParam = Array.isArray(params.role) ? params.role[0] : params.role;
  const initialRole: AdminUserRoleFilter =
    roleParam === "partner" ||
    roleParam === "student" ||
    roleParam === "admin"
      ? roleParam
      : "all";
  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter>(initialRole);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPromote, setShowPromote] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteBrandId, setPromoteBrandId] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(inputValue.trim()), 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    if (
      roleParam === "partner" ||
      roleParam === "student" ||
      roleParam === "admin"
    ) {
      setRoleFilter(roleParam);
    }
  }, [roleParam]);

  const {
    users,
    totalCount,
    pageLimit,
    brands,
    isLoading,
    isRefreshing,
    actingUserId,
    promoting,
    error,
    message,
    refresh,
    promote,
    demote,
  } = useAdminUsers(roleFilter, searchQuery);

  const brandOptions = useMemo(
    () => [
      { value: "", label: "Select Brand" },
      ...brands.map((b) => ({ value: b.id, label: b.name })),
    ],
    [brands],
  );

  const openPromote = (email: string) => {
    setPromoteEmail(email);
    setPromoteBrandId("");
    setShowPromote(true);
  };

  const submitPromote = () => {
    if (!promoteEmail.trim() || !promoteBrandId) {
      Alert.alert("Missing details", "Enter an email and select a brand.");
      return;
    }
    const brandName =
      brands.find((b) => b.id === promoteBrandId)?.name ?? "the selected brand";
    Alert.alert(
      "Promote to partner?",
      `Grant partner access for ${brandName} to ${promoteEmail.trim()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Promote",
          onPress: () => {
            void (async () => {
              const promoteError = await promote(
                promoteEmail.trim(),
                promoteBrandId,
              );
              if (!promoteError) {
                setShowPromote(false);
                setPromoteEmail("");
                setPromoteBrandId("");
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.userId}
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
              View all users, promote to partner, or demote back to student.
            </Text>
            {totalCount > pageLimit ? (
              <Text style={styles.capNote}>
                Showing first {pageLimit} of {totalCount}
              </Text>
            ) : null}
            {message ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {showPromote ? (
              <View style={styles.promoteForm}>
                <Text style={styles.promoteTitle}>Promote User to Partner</Text>
                <FormField
                  label="Email"
                  value={promoteEmail}
                  onChangeText={setPromoteEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="User email address"
                />
                <Select
                  label="Brand"
                  value={promoteBrandId}
                  options={brandOptions}
                  onChange={setPromoteBrandId}
                />
                <View style={styles.promoteActions}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={() => setShowPromote(false)}
                    style={styles.promoteBtn}
                  />
                  <Button
                    label="Promote"
                    loading={promoting}
                    onPress={submitPromote}
                    style={styles.promoteBtn}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.searchWrap}>
              <Search color={colors.onSurfaceVariant} size={18} />
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Search by email or brand..."
                placeholderTextColor={colors.inverseOnSurface}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <SegmentedControl
              options={ROLE_FILTERS}
              value={roleFilter}
              onChange={setRoleFilter}
            />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyBody}>No users found.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <UserCard
            user={item}
            acting={actingUserId === item.userId}
            onPromote={() => openPromote(item.email)}
            onDemote={() => {
              Alert.alert(
                "Demote to student?",
                `Demote ${item.email} back to student? Their partner profile will be removed.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Demote",
                    style: "destructive",
                    onPress: () => {
                      void demote(item.userId, item.email);
                    },
                  },
                ],
              );
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerBlock: {
    gap: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  capNote: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  successBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
  },
  successText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.errorContainer,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onErrorContainer,
  },
  promoteForm: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLowest,
  },
  promoteTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onBackground,
  },
  promoteActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  promoteBtn: {
    flex: 1,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
    paddingVertical: spacing.sm,
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
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
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  emailRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  email: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    color: colors.onBackground,
  },
  badge: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  demoteChip: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  demoteLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#b45309",
  },
  promoteChip: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  promoteLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  protected: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.outline,
  },
  pressed: {
    opacity: 0.75,
  },
});
