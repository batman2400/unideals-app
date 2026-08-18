import { Search } from "lucide-react-native";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTabBarMotion } from "@/context/TabBarMotionContext";
import { SEARCH_CHIP_HEIGHT, searchFieldTargetLayout } from "@/lib/tabBar";
import { colors, spacing } from "@/theme";

export function SearchMorph() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const {
    morphProgress,
    searchFieldVisibleSv,
    chipHidden,
    chipX,
    chipY,
    chipW,
    chipH,
  } = useTabBarMotion();

  const target = searchFieldTargetLayout(windowWidth, insets.top);

  const targetX = target.x;
  const targetY = target.y;
  const targetW = target.width;
  const targetH = target.height;

  const cloneStyle = useAnimatedStyle(() => {
    const progress = morphProgress.value;
    return {
      left: interpolate(progress, [0, 1], [chipX.value, targetX]),
      top: interpolate(progress, [0, 1], [chipY.value, targetY]),
      width: interpolate(progress, [0, 1], [chipW.value, targetW]),
      height: interpolate(progress, [0, 1], [chipH.value, targetH]),
      borderRadius: interpolate(progress, [0, 1], [chipH.value / 2, targetH / 2]),
      backgroundColor: interpolateColor(
        progress,
        [0, 1],
        [colors.primary, colors.surfaceContainerLowest],
      ),
      borderWidth: interpolate(progress, [0, 1], [0, StyleSheet.hairlineWidth]),
      borderColor: colors.outlineVariant,
    };
  });

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0, 0.35], [1, 0]),
  }));

  const iconOnPrimary = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0, 0.55], [1, 0]),
  }));

  const iconOnField = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0.45, 1], [0, 1]),
  }));

  const overlayStyle = useAnimatedStyle(() => {
    const morphing =
      morphProgress.value > 0.001 ||
      (chipHidden.value === 1 && searchFieldVisibleSv.value !== 1);
    return {
      opacity: morphing && searchFieldVisibleSv.value !== 1 ? 1 : 0,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, overlayStyle]}
    >
      <Animated.View style={[styles.clone, cloneStyle]}>
        <Animated.View style={[styles.iconLayer, iconOnPrimary]}>
          <Search color={colors.onPrimary} size={18} strokeWidth={2.4} />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, iconOnField]}>
          <Search color={colors.onSurfaceVariant} size={18} />
        </Animated.View>
        <Animated.Text numberOfLines={1} style={[styles.label, labelStyle]}>
          Search
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 24,
  },
  clone: {
    position: "absolute",
    height: SEARCH_CHIP_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    overflow: "hidden",
  },
  iconLayer: {
    position: "absolute",
    left: spacing.md,
  },
  label: {
    marginLeft: 22,
    fontSize: 13,
    fontWeight: "800",
    color: colors.onPrimary,
  },
});
