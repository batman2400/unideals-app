import { Tabs } from "expo-router";
import { Fragment, type ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatingTabBarBackground } from "@/components/FloatingTabBarBackground";
import { SearchChip } from "@/components/SearchChip";
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_HORIZONTAL_INSET,
  TAB_BAR_RADIUS,
  floatingTabBarBottomOffset,
} from "@/lib/tabBar";
import { colors } from "@/theme";

type FloatingTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

type TabRoute = FloatingTabBarProps["state"]["routes"][number];

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: floatingTabBarBottomOffset(insets.bottom) },
      ]}
    >
      <View style={styles.pill}>
        <FloatingTabBarBackground />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const item = (
              <TabItem
                key={route.key}
                route={route}
                focused={state.index === index}
                descriptor={descriptors[route.key]}
                navigation={navigation}
              />
            );

            if (route.name === "deals") {
              return (
                <Fragment key={route.key}>
                  {item}
                  <SearchChip />
                </Fragment>
              );
            }

            return item;
          })}
        </View>
      </View>
    </View>
  );
}

function TabItem({
  route,
  focused,
  descriptor,
  navigation,
}: {
  route: TabRoute;
  focused: boolean;
  descriptor: FloatingTabBarProps["descriptors"][string] | undefined;
  navigation: FloatingTabBarProps["navigation"];
}) {
  const options = descriptor?.options;
  const color = focused ? colors.primary : colors.onSurfaceVariant;
  const label = options?.title ?? route.name;
  const icon = options?.tabBarIcon?.({
    focused,
    color,
    size: 22,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
      onPress={() => {
        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });
        if (!focused && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      }}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
    >
      {icon}
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: TAB_BAR_HORIZONTAL_INSET,
    right: TAB_BAR_HORIZONTAL_INSET,
    height: TAB_BAR_HEIGHT,
    overflow: "visible",
    zIndex: 20,
    ...Platform.select({
      android: { elevation: 16 },
      default: {},
    }),
  },
  pill: {
    flex: 1,
    borderRadius: TAB_BAR_RADIUS,
    overflow: "visible",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 4,
  },
  tabPressed: {
    opacity: 0.8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
