import { useRouter, type Href } from "expo-router";
import { GraduationCap, Mail } from "lucide-react-native";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { SUPPORT_EMAIL } from "@/lib/inquiryForm";
import { colors, radius, spacing } from "@/theme";

const FAQS: readonly { question: string; answer: string }[] = [
  {
    question: "How do I verify my student status?",
    answer:
      "Open Profile and verify with a university email OTP to get access immediately, or upload your student ID for manual review if you do not have an institute email. Verification is valid for 12 months.",
  },
  {
    question: "Do I need to verify every year?",
    answer:
      "Yes. Student status lasts 12 months from approval. Re-verify from Profile before it expires so you can keep unlocking deal codes and in-store tickets.",
  },
  {
    question: "How do I redeem a deal?",
    answer:
      "Open a deal from Home or Deals. Online offers reveal a code; in-store offers generate a timed QR ticket for the partner to scan.",
  },
  {
    question: "Can I submit an event for my society?",
    answer:
      "Yes. Use Submit Event on the Events tab, or send an Event Collaboration message from Contact.",
  },
  {
    question: "Are partnerships paid?",
    answer:
      "We offer both free student discounts and featured placements. Reach out through Contact to learn more.",
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <Text style={styles.lead}>
        We’re here to help you get the most out of Uni Deals.
      </Text>

      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <Mail color={colors.primary} size={22} />
        </View>
        <Text style={styles.cardTitle}>Email us</Text>
        <Text style={styles.cardBody}>
          Have a question or need assistance? Drop us an email and our support
          team will get back to you within 24 hours.
        </Text>
        <Button
          label={SUPPORT_EMAIL}
          variant="secondary"
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <GraduationCap color={colors.primary} size={22} />
        </View>
        <Text style={styles.cardTitle}>Verification help</Text>
        <Text style={styles.cardBody}>
          A correct code sent to your university email verifies you immediately.
          If you do not have an institute email, upload both sides of your
          student ID from Profile. Status expires after 12 months, so re-verify
          each year to keep access.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Frequently asked questions</Text>
      {FAQS.map((item) => (
        <View key={item.question} style={styles.faq}>
          <Text style={styles.faqQuestion}>{item.question}</Text>
          <Text style={styles.faqAnswer}>{item.answer}</Text>
        </View>
      ))}

      <Button
        label="Contact the team"
        onPress={() =>
          router.push({
            pathname: "/contact",
            params: { type: "support" },
          } as Href)
        }
      />
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
    gap: spacing.lg,
  },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onBackground,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  sectionTitle: {
    marginLeft: spacing.sm,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  faq: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onBackground,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
});
