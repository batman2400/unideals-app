import { Search } from "lucide-react-native";
import { useRef } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useTabBarMotion } from "@/context/TabBarMotionContext";
import {
  SEARCH_CHIP_COLLAPSED_WIDTH,
  SEARCH_CHIP_EXPANDED_WIDTH,
  SEARCH_CHIP_HEIGHT,
} from "@/lib/tabBar";
import { colors } from "@/theme";

export function SearchChip({ onSearch }: { onSearch: boolean }) {
  const { morphProgress, openSearch, cacheChipLayout } = useTabBarMotion();
  const chipRef = useRef<View>(null);
  const scale = useSharedValue(1);

  const cacheFrame = () => {
    chipRef.current?.measureInWindow((x, y, width, height) => {
      cacheChipLayout({ x, y, width, height });
    });
  };

  const chipStyle = useAnimatedStyle(() => {
    const progress = morphProgress.value;
    return {
      width: interpolate(
        progress,
        [0, 1],
        [SEARCH_CHIP_EXPANDED_WIDTH, SEARCH_CHIP_COLLAPSED_WIDTH],
      ),
      paddingHorizontal: interpolate(progress, [0, 1], [20, 0]),
      transform: [{ scale: scale.value }],
    };
  });

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0, 0.68], [1, 0]),
    maxWidth: interpolate(morphProgress.value, [0, 1], [60, 0]),
    marginLeft: interpolate(morphProgress.value, [0, 1], [8, 0]),
  }));

  return (
    <Animated.View
      ref={chipRef}
      collapsable={false}
      onLayout={cacheFrame}
      style={[styles.chip, chipStyle]}
    >
      <Pressable
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
          const node = chipRef.current;
          if (!node) {
            openSearch(null);
            return;
          }
          node.measureInWindow((x, y, width, height) => {
            openSearch(width > 10 ? { x, y, width, height } : null);
          });
        }}
        style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
      >
        <Search color={colors.onPrimary} size={22} strokeWidth={onSearch ? 2.5 : 2} />
        <Animated.Text numberOfLines={1} style={[styles.label, labelStyle]}>
          Search
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: SEARCH_CHIP_HEIGHT,
    minWidth: SEARCH_CHIP_COLLAPSED_WIDTH,
    minHeight: SEARCH_CHIP_COLLAPSED_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    overflow: "hidden",
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
  hit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.92,
  },
});
