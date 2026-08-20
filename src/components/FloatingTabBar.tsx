import { Tabs } from "expo-router";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SearchChip } from "@/components/SearchChip";
import { useTabBarMotion } from "@/context/TabBarMotionContext";
import {
  SEARCH_CHIP_COLLAPSED_WIDTH,
  SEARCH_CHIP_EXPANDED_WIDTH,
  TAB_BAR_HEIGHT,
  TAB_BAR_HORIZONTAL_INSET,
  TAB_CHIP_GAP,
  TAB_ICON_SIZE,
  floatingTabBarBottomOffset,
} from "@/lib/tabBar";
import { colors } from "@/theme";

type FloatingTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

type TabRoute = FloatingTabBarProps["state"]["routes"][number];

const BASE_TAB_ORDER = ["index", "deals", "events", "profile"] as const;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { lastTabRef, leaveSearch, closeSearchMorph } = useTabBarMotion();
  const focusedName = state.routes[state.index]?.name ?? "index";
  const onSearch = focusedName === "search";
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const keyboardVisible = useSharedValue(0);

  const baseTabs = useMemo(() => {
    return BASE_TAB_ORDER.map((name) => {
      const index = state.routes.findIndex((route) => route.name === name);
      return index >= 0 ? { route: state.routes[index], index } : null;
    }).filter((item): item is { route: TabRoute; index: number } => item !== null);
  }, [state.routes]);

  useEffect(() => {
    if (focusedName !== "search") {
      lastTabRef.current = focusedName;
      closeSearchMorph();
    }
  }, [closeSearchMorph, focusedName, lastTabRef]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => {
      setKeyboardOpen(true);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const hideBar = onSearch && keyboardOpen;
    keyboardVisible.value = withTiming(hideBar ? 1 : 0, { duration: 280 });
    if (!onSearch && keyboardOpen) {
      setKeyboardOpen(false);
    }
  }, [keyboardOpen, keyboardVisible, onSearch]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(keyboardVisible.value, [0, 1], [1, 0]),
    transform: [
      {
        translateY: interpolate(keyboardVisible.value, [0, 1], [0, 88]),
      },
    ],
  }));

  const renderTab = (item: { route: TabRoute; index: number }) => (
    <TabItem
      key={item.route.key}
      route={item.route}
      focused={!onSearch && state.index === item.index}
      descriptor={descriptors[item.route.key]}
      navigation={navigation}
      onSearch={onSearch}
      onLeaveSearch={leaveSearch}
    />
  );

  return (
    <Animated.View
      pointerEvents={onSearch && keyboardOpen ? "none" : "box-none"}
      style={[
        styles.wrap,
        { bottom: floatingTabBarBottomOffset(insets.bottom) },
        wrapStyle,
      ]}
    >
      {baseTabs[0] ? renderTab(baseTabs[0]) : null}
      {baseTabs[1] ? renderTab(baseTabs[1]) : null}
      <SearchChip onSearch={onSearch} />
      {baseTabs[2] ? renderTab(baseTabs[2]) : null}
      {baseTabs[3] ? renderTab(baseTabs[3]) : null}
    </Animated.View>
  );
}

function TabItem({
  route,
  focused,
  descriptor,
  navigation,
  onSearch,
  onLeaveSearch,
}: {
  route: TabRoute;
  focused: boolean;
  descriptor: FloatingTabBarProps["descriptors"][string] | undefined;
  navigation: FloatingTabBarProps["navigation"];
  onSearch: boolean;
  onLeaveSearch: (tabName: string) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const { morphProgress } = useTabBarMotion();
  const scale = useSharedValue(1);
  const options = descriptor?.options;
  const color = focused ? colors.primary : "#6B7280";
  const label = options?.title ?? route.name;
  const icon = options?.tabBarIcon?.({
    focused,
    color,
    size: TAB_ICON_SIZE,
  });

  const pillStyle = useAnimatedStyle(() => {
    const searchW = interpolate(
      morphProgress.value,
      [0, 1],
      [SEARCH_CHIP_EXPANDED_WIDTH, SEARCH_CHIP_COLLAPSED_WIDTH],
    );
    const available =
      windowWidth -
      TAB_BAR_HORIZONTAL_INSET * 2 -
      searchW -
      TAB_CHIP_GAP * 4;
    return {
      width: Math.max(48, available / 4),
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
      onPressIn={() => {
        scale.value = withTiming(0.94, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 240 });
      }}
      onPress={() => {
        if (onSearch) {
          onLeaveSearch(route.name);
          return;
        }
        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });
        if (!focused && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      }}
      style={[styles.pill, pillStyle]}
    >
      {icon}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: TAB_BAR_HORIZONTAL_INSET,
    right: TAB_BAR_HORIZONTAL_INSET,
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: TAB_CHIP_GAP,
    zIndex: 50,
    overflow: "visible",
  },
  pill: {
    minWidth: 48,
    minHeight: 48,
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: TAB_BAR_HEIGHT / 2,
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    ...Platform.select({
      android: { elevation: 8 },
      default: {},
    }),
  },
});
