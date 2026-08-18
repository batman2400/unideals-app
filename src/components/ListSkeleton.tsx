import { ScrollView, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/theme";

interface ListSkeletonProps {
  variant?: "list" | "carousel";
  count?: number;
}

function SkeletonCard({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.image, compact && styles.imageCompact]} />
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
    width: 220,
  },
  image: {
    height: 150,
    backgroundColor: colors.surfaceContainer,
  },
  imageCompact: {
    height: 180,
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
