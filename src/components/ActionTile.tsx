import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

interface ActionTileProps {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}

export function ActionTile({ label, icon, onPress }: ActionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: "45%",
    aspectRatio: 1,
    minHeight: MIN_TAP_TARGET * 2.5,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  pressed: {
    opacity: 0.85,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLow,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: colors.onBackground,
  },
});
