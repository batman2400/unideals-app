import { Image } from "expo-image";
import { Store, Tag } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/theme";
import type { Deal } from "@/types/database";

interface DealCardProps {
  deal: Deal;
  onPress?: (deal: Deal) => void;
}

export function DealCard({ deal, onPress }: DealCardProps) {
  const isInStore = deal.type === "In-Store";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deal.discount} at ${deal.brand}`}
      onPress={() => onPress?.(deal)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {deal.imageUrl ? (
          <Image
            source={{ uri: deal.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Tag color={colors.primary} size={28} />
          </View>
        )}

        <View style={[styles.badge, isInStore ? styles.badgeInStore : styles.badgeOnline]}>
          {isInStore ? (
            <Store color={colors.onErrorContainer} size={12} />
          ) : (
            <Tag color={colors.onPrimaryContainer} size={12} />
          )}
          <Text
            style={[
              styles.badgeText,
              isInStore ? styles.badgeTextInStore : styles.badgeTextOnline,
            ]}
          >
            {deal.type}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.brand} numberOfLines={1}>
          {deal.brand}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {deal.title}
        </Text>
        <Text style={styles.discount}>{deal.discount}</Text>
        {deal.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {deal.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.9,
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 150,
    backgroundColor: colors.surfaceContainer,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  badgeInStore: {
    backgroundColor: colors.errorContainer,
  },
  badgeOnline: {
    backgroundColor: colors.primaryContainer,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextInStore: {
    color: colors.onErrorContainer,
  },
  badgeTextOnline: {
    color: colors.onPrimaryContainer,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  brand: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onBackground,
  },
  discount: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.primary,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
});
