import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { Platform, StyleSheet, View } from "react-native";

import { TAB_BAR_RADIUS } from "@/lib/tabBar";
import { colors } from "@/theme";

function canUseLiquidGlass() {
  if (Platform.OS !== "ios") return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

/** Frosted / liquid-glass fill clipped to the floating pill. */
export function FloatingTabBarBackground() {
  if (canUseLiquidGlass()) {
    return (
      <GlassView
        style={styles.glass}
        glassEffectStyle="regular"
        isInteractive
        colorScheme="light"
        tintColor="rgba(252, 249, 248, 0.28)"
      />
    );
  }

  if (Platform.OS === "ios") {
    return (
      <View style={styles.fallbackClip}>
        <BlurView
          intensity={72}
          tint="systemChromeMaterialLight"
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return <View style={[styles.fallbackClip, styles.solidFill]} />;
}

const styles = StyleSheet.create({
  glass: {
    ...StyleSheet.absoluteFill,
    borderRadius: TAB_BAR_RADIUS,
  },
  fallbackClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: TAB_BAR_RADIUS,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(178, 178, 177, 0.5)",
  },
  solidFill: {
    backgroundColor: colors.surfaceContainerLowest,
  },
});
