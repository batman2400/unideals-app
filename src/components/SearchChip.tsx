import { Search } from "lucide-react-native";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import { useTabBarMotion } from "@/context/TabBarMotionContext";
import {
  SEARCH_CHIP_COLLAPSED_WIDTH,
  SEARCH_CHIP_EXPANDED_WIDTH,
  SEARCH_CHIP_HEIGHT,
} from "@/lib/tabBar";
import { colors, spacing } from "@/theme";

export function SearchChip() {
  const { collapsed, chipHidden, openSearch } = useTabBarMotion();
  const chipRef = useRef<View>(null);

  const chipStyle = useAnimatedStyle(() => ({
    width: interpolate(
      collapsed.value,
      [0, 1],
      [SEARCH_CHIP_EXPANDED_WIDTH, SEARCH_CHIP_COLLAPSED_WIDTH],
    ),
    opacity: interpolate(chipHidden.value, [0, 1], [1, 0]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapsed.value, [0, 0.4, 1], [1, 0, 0]),
    maxWidth: interpolate(collapsed.value, [0, 1], [72, 0]),
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search"
      onPress={() => {
        chipRef.current?.measureInWindow((x, y, width, height) => {
          openSearch({ x, y, width, height });
        });
      }}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View ref={chipRef} collapsable={false}>
        <Animated.View style={[styles.chip, chipStyle]}>
          <Search color={colors.onPrimary} size={18} strokeWidth={2.4} />
          <Animated.Text
            numberOfLines={1}
            style={[styles.label, labelStyle]}
          >
            Search
          </Animated.Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: SEARCH_CHIP_HEIGHT,
    borderRadius: SEARCH_CHIP_HEIGHT / 2,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    overflow: "hidden",
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.9,
  },
});
