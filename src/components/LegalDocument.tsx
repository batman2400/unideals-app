import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { LegalSection } from "@/lib/legalContent";
import { colors, spacing } from "@/theme";

interface LegalDocumentProps {
  kicker?: string;
  title: string;
  updated: string;
  sections: readonly LegalSection[];
}

export function LegalDocument({
  kicker = "Uni Deals Trust Center",
  title,
  updated,
  sections,
}: LegalDocumentProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>Last updated: {updated}</Text>
      </View>

      {sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.onBackground,
  },
  updated: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  section: {
    gap: spacing.sm,
  },
  heading: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onBackground,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.onSurface,
  },
});
