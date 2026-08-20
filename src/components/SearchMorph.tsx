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
  const { morphProgress, chipX, chipY, chipW, chipH } = useTabBarMotion();

  const target = searchFieldTargetLayout(windowWidth, insets.top);
  const targetX = target.x;
  const targetY = target.y;
  const targetW = target.width;
  const targetH = target.height;

  const cloneStyle = useAnimatedStyle(() => {
    const progress = morphProgress.value;
    const width = Math.max(1, chipW.value);
    const height = Math.max(1, chipH.value);
    const scaleX = interpolate(progress, [0, 1], [1, targetW / width]);
    const scaleY = interpolate(progress, [0, 1], [1, targetH / height]);
    const fromCx = chipX.value + width / 2;
    const fromCy = chipY.value + height / 2;
    const toCx = targetX + targetW / 2;
    const toCy = targetY + targetH / 2;
    const visualRadius = interpolate(progress, [0, 1], [height / 2, targetH / 2]);

    return {
      left: chipX.value,
      top: chipY.value,
      width,
      height,
      borderRadius: visualRadius / scaleY,
      backgroundColor: interpolateColor(
        progress,
        [0, 1],
        [colors.primary, colors.surfaceContainerLowest],
      ),
      borderWidth: interpolate(progress, [0, 1], [0, StyleSheet.hairlineWidth]),
      borderColor: colors.outlineVariant,
      transform: [
        { translateX: interpolate(progress, [0, 1], [0, toCx - fromCx]) },
        { translateY: interpolate(progress, [0, 1], [0, toCy - fromCy]) },
        { scaleX },
        { scaleY },
      ],
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0, 0.1, 0.78, 1], [0, 1, 0.55, 0]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0, 0.28], [1, 0]),
  }));

  const iconOnPrimary = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0, 0.42], [1, 0]),
  }));

  const iconOnField = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0.38, 0.82], [0, 1]),
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]}>
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
