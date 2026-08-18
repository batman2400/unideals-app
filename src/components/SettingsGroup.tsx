import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

export interface SettingsRowItem {
  key: string;
  label: string;
  subtitle?: string;
  icon: ReactNode;
  onPress: () => void;
}

interface SettingsGroupProps {
  title: string;
  rows: readonly SettingsRowItem[];
}

export function SettingsGroup({ title, rows }: SettingsGroupProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Pressable
            key={row.key}
            accessibilityRole="button"
            accessibilityLabel={row.label}
            onPress={row.onPress}
            style={({ pressed }) => [
              styles.row,
              index < rows.length - 1 && styles.rowDivider,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.leading}>{row.icon}</View>
            <View style={styles.labelBlock}>
              <Text style={styles.label}>{row.label}</Text>
              {row.subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {row.subtitle}
                </Text>
              ) : null}
            </View>
            <ChevronRight color={colors.outlineVariant} size={18} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  title: {
    marginLeft: spacing.sm,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    overflow: "hidden",
  },
  row: {
    minHeight: MIN_TAP_TARGET + 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceVariant,
  },
  pressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  leading: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  labelBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.onBackground,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.onSurfaceVariant,
  },
});
