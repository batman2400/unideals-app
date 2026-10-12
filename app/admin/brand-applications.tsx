import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useKeyboardInset } from "@/components/KeyboardForm";
import {
  useAdminBrandApplications,
  type BrandReviewItem,
} from "@/lib/useAdminBrandApplications";
import { colors, radius, spacing } from "@/theme";

function detailLine(label: string, value: string | null | undefined) {
  if (!value?.trim()) return null;
  return `${label}: ${value.trim()}`;
}

function ReviewCard({
  item,
  acting,
  onApprove,
  onReject,
}: {
  item: BrandReviewItem;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const lines = [
    item.kind === "profile" && item.pendingName
      ? `Requested name: ${item.pendingName}`
      : null,
    detailLine("Category", item.category),
    detailLine("Contact", item.contactName),
    detailLine("Phone", item.contactPhone),
    detailLine("Website", item.websiteUrl),
    detailLine("Instagram", item.instagramHandle),
    detailLine("TikTok", item.tiktokHandle),
    detailLine("Location", item.location),
    detailLine("About", item.description),
  ].filter((line): line is string => Boolean(line));

  const preview =
    item.kind === "profile"
      ? (item.pendingLogoUrl ?? item.logoUrl)
      : item.logoUrl;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.logo} contentFit="cover" />
        ) : (
          <View style={[styles.logo, styles.logoFallback]} />
        )}
        <View style={styles.cardTitleWrap}>
          <Text style={styles.kind}>
            {item.kind === "application" ? "New application" : "Name or logo change"}
          </Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
      </View>
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
      <View style={styles.actions}>
        <Button
          label="Approve"
          onPress={onApprove}
          loading={acting}
          disabled={acting}
          style={styles.actionButton}
        />
        <Button
          label="Reject"
          onPress={onReject}
          variant="secondary"
          disabled={acting}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

export default function AdminBrandApplicationsScreen() {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const {
    items,
    isLoading,
    isRefreshing,
    unavailable,
    error,
    actingKey,
    refresh,
    approve,
    reject,
  } = useAdminBrandApplications();
  const [rejecting, setRejecting] = useState<BrandReviewItem | null>(null);
  const [reason, setReason] = useState("");

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.lead}>
              Approving an application promotes that student to a partner for
              the brand. Rejected applicants can edit and resubmit. Name and
              logo changes stay off the public catalogue until you approve them.
            </Text>
            {unavailable ? (
              <Text style={styles.banner}>
                This queue is not live yet. Apply the brand applications SQL
                in Supabase first.
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          unavailable ? null : (
            <Text style={styles.empty}>No brand applications waiting.</Text>
          )
        }
        renderItem={({ item }) => (
          <ReviewCard
            item={item}
            acting={actingKey === `${item.kind}:${item.id}`}
            onApprove={() => void approve(item)}
            onReject={() => {
              setReason("");
              setRejecting(item);
            }}
          />
        )}
      />

      <Modal
        visible={rejecting != null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejecting(null)}
      >
        <View
          style={[
            styles.backdrop,
            { paddingBottom: keyboardInset + spacing.lg },
          ]}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Reject this review?</Text>
            <Text style={styles.sheetBody}>
              A short reason is shown to the brand. Leave it blank to reject
              without one.
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason"
              placeholderTextColor={colors.inverseOnSurface}
              style={styles.reason}
              multiline
            />
            <Button
              label="Reject"
              onPress={() => {
                const item = rejecting;
                if (!item) return;
                setRejecting(null);
                void reject(item, reason);
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setRejecting(null)}
              style={styles.cancel}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
  banner: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
    color: colors.onPrimaryContainer,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceVariant,
  },
  logoFallback: {
    backgroundColor: colors.surfaceVariant,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 2,
  },
  kind: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBackground,
  },
  line: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBackground,
  },
  sheetBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  reason: {
    minHeight: 88,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    color: colors.onBackground,
    textAlignVertical: "top",
  },
  cancel: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
});
