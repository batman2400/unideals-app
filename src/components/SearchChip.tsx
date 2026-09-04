import { Search } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useTabBarMotion } from "@/context/TabBarMotionContext";
import {
  SEARCH_CHIP_EXPANDED_WIDTH,
  SEARCH_CHIP_HEIGHT,
} from "@/lib/tabBar";
import { colors, spacing } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SearchChip({ onSearch }: { onSearch: boolean }) {
  const { openSearch } = useTabBarMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: onSearch }}
      accessibilityLabel="Search"
      onPressIn={() => {
        if (onSearch) return;
        scale.value = withTiming(0.96, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 240 });
      }}
      onPress={() => {
        if (onSearch) return;
        openSearch();
      }}
      style={[styles.chip, animatedStyle]}
    >
      <Search
        color={colors.onPrimary}
        size={20}
        strokeWidth={onSearch ? 2.5 : 2}
      />
      <Text numberOfLines={1} style={styles.label}>
        Search
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: SEARCH_CHIP_HEIGHT,
    width: SEARCH_CHIP_EXPANDED_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: SEARCH_CHIP_HEIGHT / 2,
    backgroundColor: colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    ...Platform.select({
      android: { elevation: 8 },
      default: {},
    }),
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onPrimary,
  },
});
