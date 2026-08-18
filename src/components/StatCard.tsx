import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/theme";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  valueColor?: string;
  onPress?: () => void;
}

export function StatCard({
  label,
  value,
  icon,
  valueColor = colors.onBackground,
  onPress,
}: StatCardProps) {
  const body = (
    <>
      <View style={styles.top}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
      </View>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={styles.card}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "45%",
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.85,
    borderColor: colors.primary,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  icon: {
    marginTop: 1,
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
});
