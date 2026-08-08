import { Tabs } from "expo-router";
import { QrCode, Sparkles, UserRound } from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { role } = useAuth();

  // Ticket validation RPC only allows partners (not admins). Hide Scan for
  // everyone else until brand impersonation exists on mobile.
  const canScan = role === "partner";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        sceneStyle: styles.scene,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Deals",
          tabBarIcon: ({ color, size }) => (
            <Sparkles color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scan",
          href: canScan ? "/scanner" : null,
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <UserRound color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopColor: colors.surfaceVariant,
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 88 : 64,
    paddingTop: 6,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  scene: {
    backgroundColor: colors.background,
  },
});
