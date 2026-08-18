import { useRouter, type Href } from "expo-router";
import { ChevronRight, LayoutDashboard, Shield } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

export default function ProfileTabScreen() {
  const { role } = useAuth();
  const router = useRouter();

  const portal =
    role === "partner" ? (
      <PortalCard
        title="Open Partner Portal"
        description="Manage your deals, scan student tickets, and view analytics."
        icon={<LayoutDashboard color={colors.onPrimary} size={28} />}
        onPress={() => router.push("/partner/dashboard" as Href)}
      />
    ) : role === "admin" ? (
      <PortalCard
        title="Open Admin Portal"
        description="Moderate deals and events, verify students, and manage users."
        icon={<Shield color={colors.onPrimary} size={28} />}
        onPress={() => router.push("/admin/dashboard" as Href)}
      />
    ) : undefined;

  return <ProfileScreen extraSections={portal} />;
}

function PortalCard({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.portalCard, pressed && styles.portalPressed]}
    >
      <View style={styles.portalIcon}>{icon}</View>
      <View style={styles.portalText}>
        <Text style={styles.portalTitle}>{title}</Text>
        <Text style={styles.portalDescription}>{description}</Text>
      </View>
      <ChevronRight color={colors.onPrimary} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  portalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: MIN_TAP_TARGET * 2,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  portalPressed: {
    opacity: 0.9,
  },
  portalIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryDim,
  },
  portalText: {
    flex: 1,
    gap: spacing.xs,
  },
  portalTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.onPrimary,
  },
  portalDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.primaryContainer,
  },
});
