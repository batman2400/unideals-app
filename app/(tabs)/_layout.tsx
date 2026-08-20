import { Tabs } from "expo-router";
import { CalendarDays, Home, Tag, UserRound } from "lucide-react-native";
import { StyleSheet } from "react-native";

import { FloatingTabBar } from "@/components/FloatingTabBar";
import { colors } from "@/theme";

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: false,
        sceneStyle: styles.scene,
        animation: "none",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused, size }) => (
            <Home
              color={color}
              size={size}
              strokeWidth={focused ? 2.6 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: "Deals",
          tabBarIcon: ({ color, focused, size }) => (
            <Tag
              color={color}
              size={size}
              strokeWidth={focused ? 2.6 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused, size }) => (
            <CalendarDays
              color={color}
              size={size}
              strokeWidth={focused ? 2.6 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused, size }) => (
            <UserRound
              color={color}
              size={size}
              strokeWidth={focused ? 2.6 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null,
          title: "Search",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.background,
  },
});
