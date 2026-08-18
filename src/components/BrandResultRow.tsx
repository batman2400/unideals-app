import { Image } from "expo-image";
import { ChevronRight, Store } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DealBrandSummary } from "@/lib/useDeals";
import { colors, radius, spacing } from "@/theme";

export function BrandResultRow({
  brand,
  onPress,
}: {
  brand: DealBrandSummary;
  onPress: (brand: DealBrandSummary) => void;
}) {
  const countLabel = brand.dealCount === 1 ? "1 deal" : `${brand.dealCount} deals`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${brand.name}, ${countLabel}`}
      onPress={() => onPress(brand)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {brand.imageUrl ? (
        <Image
          source={{ uri: brand.imageUrl }}
          style={styles.thumb}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Store color={colors.primary} size={20} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {brand.name}
        </Text>
        <Text style={styles.meta}>{countLabel}</Text>
      </View>
      <ChevronRight color={colors.onSurfaceVariant} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  pressed: {
    opacity: 0.88,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onBackground,
  },
  meta: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
});
