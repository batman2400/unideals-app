import { useRouter, type Href } from "expo-router";
import { Bookmark } from "lucide-react-native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { DealCard } from "@/components/DealCard";
import { useSavedDealCatalog } from "@/lib/useDeals";
import { useSavedDeals } from "@/lib/useSavedDeals";
import { colors, spacing } from "@/theme";

export default function SavedDealsScreen() {
  const router = useRouter();
  const { savedIds, isLoading: savedLoading, error: savedError, refresh: refreshSaved, toggleSave } =
    useSavedDeals();
  const { deals, isLoading: dealsLoading, isRefreshing, error, refresh } =
    useSavedDealCatalog(savedIds);

  const hiddenCount = Math.max(0, savedIds.size - deals.length);
  const isLoading = dealsLoading || savedLoading;

  const emptyUnavailable = useMemo(
    () => savedIds.size > 0 && deals.length === 0,
    [savedIds.size, deals.length],
  );

  return (
    <View style={styles.root}>
      {isLoading ? (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(deal) => String(deal.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void refresh();
                void refreshSaved();
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <DealCard
              deal={item}
              saved={savedIds.has(item.id)}
              saveDisabled={savedLoading}
              onToggleSave={toggleSave}
              onPress={(deal) => router.push(`/deal/${deal.id}` as Href)}
            />
          )}
          ListHeaderComponent={
            error || savedError ? (
              <Text style={styles.errorText}>
                {[error, savedError].filter(Boolean).join(" ")}
              </Text>
            ) : null
          }
          ListFooterComponent={
            hiddenCount > 0 && deals.length > 0 ? (
              <Text style={styles.endedNote}>
                {hiddenCount === 1
                  ? "1 saved offer is no longer available."
                  : `${hiddenCount} saved offers are no longer available.`}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            savedError ? (
              <View style={styles.stateBlock}>
                <Text style={styles.stateTitle}>Could not load saved deals</Text>
                <Text style={styles.stateBody}>{savedError}</Text>
                <Button
                  label="Retry"
                  onPress={() => void refreshSaved()}
                />
              </View>
            ) : emptyUnavailable ? (
              <View style={styles.stateBlock}>
                <Bookmark color={colors.onSurfaceVariant} size={32} />
                <Text style={styles.stateTitle}>Saved offers unavailable</Text>
                <Text style={styles.stateBody}>
                  Those deals may have ended or been removed. Browse live
                  offers to save something new.
                </Text>
                <Button
                  label="Browse deals"
                  onPress={() => router.push("/deals" as Href)}
                />
              </View>
            ) : (
              <View style={styles.stateBlock}>
                <Bookmark color={colors.onSurfaceVariant} size={32} />
                <Text style={styles.stateTitle}>No saved deals yet</Text>
                <Text style={styles.stateBody}>
                  Tap the heart on any deal to bookmark it here.
                </Text>
                <Button
                  label="Browse deals"
                  onPress={() => router.push("/deals" as Href)}
                />
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    flexGrow: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
    marginBottom: spacing.sm,
  },
  endedNote: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: colors.onSurfaceVariant,
    paddingVertical: spacing.md,
  },
  stateBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: spacing.sm,
  },
});
