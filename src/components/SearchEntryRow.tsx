import { Search } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

type SearchEntryRowProps = {
  placeholder: string;
  onPress: (layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
};

export function SearchEntryRow({ placeholder, onPress }: SearchEntryRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={placeholder}
      onPress={() => onPress({ x: 0, y: 0, width: 0, height: 0 })}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Search color={colors.onSurfaceVariant} size={18} />
        <Text style={styles.placeholder}>{placeholder}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    minHeight: MIN_TAP_TARGET,
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  placeholder: {
    flex: 1,
    fontSize: 14,
    color: colors.inverseOnSurface,
  },
  pressed: {
    opacity: 0.85,
  },
});
