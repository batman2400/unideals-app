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
import { useDeals } from "@/lib/useDeals";
import { useSavedDeals } from "@/lib/useSavedDeals";
import { colors, spacing } from "@/theme";

export default function SavedDealsScreen() {
  const router = useRouter();
  const { deals, isLoading: dealsLoading, isRefreshing, error, refresh } =
    useDeals();
  const { savedIds, isLoading: savedLoading, error: savedError, refresh: refreshSaved, toggleSave } =
    useSavedDeals();

  const savedDeals = useMemo(
    () => deals.filter((deal) => savedIds.has(deal.id)),
    [deals, savedIds],
  );

  const isLoading = dealsLoading || savedLoading;

  return (
    <View style={styles.root}>
      {isLoading ? (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={savedDeals}
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
