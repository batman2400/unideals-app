import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

export default function NotFoundScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.body}>
        That link does not point anywhere in Uni Deals.
      </Text>
      <Link href="/" style={styles.link}>
        Back to deals
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.onBackground,
  },
  body: {
    fontSize: 14,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  link: {
    marginTop: spacing.md,
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
});
