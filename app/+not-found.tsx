import { Link, usePathname, useSegments } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { qrPayloadKind } from "@/lib/routeParams";
import { colors, spacing } from "@/theme";

export default function NotFoundScreen() {
  const pathname = usePathname();
  const segments = useSegments();
  const kind =
    qrPayloadKind(pathname) ?? qrPayloadKind(segments.join("/"));

  const title =
    kind === "ticket"
      ? "Partner Scanner QR"
      : kind === "student"
        ? "Student Pass QR"
        : "Page not found";

  const body =
    kind === "ticket"
      ? "This QR is for the Partner Scanner — it is not a page. Open Scanner from the Partner Portal to redeem it."
      : kind === "student"
        ? "This QR is for the Student Pass — it is not a page. Partners scan it at the register; you do not need to open it here."
        : "That link does not point anywhere in Uni Deals.";

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
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
