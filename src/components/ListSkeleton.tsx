import { Dimensions, ScrollView, StyleSheet, View } from "react-native";

import { colors, mediaAspectRatio, radius, spacing } from "@/theme";

const CAROUSEL_CARD_WIDTH = Math.round(Dimensions.get("window").width * 0.88);

interface ListSkeletonProps {
  variant?: "list" | "carousel";
  count?: number;
}

function SkeletonCard({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.image} />
      <View style={styles.body}>
        <View style={[styles.line, styles.lineShort]} />
        <View style={styles.line} />
        <View style={[styles.line, styles.lineMedium]} />
      </View>
    </View>
  );
}

export function ListSkeleton({
  variant = "list",
  count = 4,
}: ListSkeletonProps) {
  const cards = Array.from({ length: count }, (_, index) => (
    <SkeletonCard key={index} compact={variant === "carousel"} />
  ));

  if (variant === "carousel") {
    return (
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {cards}
      </ScrollView>
    );
  }

  return <View style={styles.list}>{cards}</View>;
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  carousel: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    overflow: "hidden",
  },
  cardCompact: {
    width: CAROUSEL_CARD_WIDTH,
  },
  image: {
    width: "100%",
    aspectRatio: mediaAspectRatio,
    backgroundColor: colors.surfaceContainer,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  line: {
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerHigh,
  },
  lineShort: {
    width: "40%",
  },
  lineMedium: {
    width: "70%",
  },
});
