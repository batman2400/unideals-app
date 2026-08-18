import { useLocalSearchParams, useRouter } from "expo-router";
import { BadgeCheck } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/AuthContext";
import {
  INQUIRY_TYPE_OPTIONS,
  needsBrandName,
  parseInquiryType,
  validateInquiry,
  type InquiryType,
} from "@/lib/inquiryForm";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { colors, radius, spacing } from "@/theme";

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, metadata } = useAuth();
  const params = useLocalSearchParams<{ type?: string }>();

  const [name, setName] = useState(
    metadata.full_name?.trim() || metadata.name?.trim() || "",
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [inquiryType, setInquiryType] = useState<InquiryType>(() =>
    parseInquiryType(params.type),
  );
  const [brandName, setBrandName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showBrandField = needsBrandName(inquiryType);

  const handleSubmit = useCallback(async () => {
    const validationError = validateInquiry({
      name,
      email,
      inquiryType,
      brandName,
      message,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const { error: submitError } = await supabase.from("inquiries").insert([
        {
          name: name.trim(),
          email: email.trim(),
          inquiry_type: inquiryType,
          brand_name: showBrandField ? brandName.trim() : null,
          message: message.trim(),
        },
      ]);
      if (submitError) throw submitError;
      setIsSuccess(true);
      setMessage("");
    } catch (caught) {
      setError(
        toErrorMessage(
          caught,
          "Failed to send your message. Please try again later.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [brandName, email, inquiryType, message, name, showBrandField]);

  if (isSuccess) {
    return (
      <View
        style={[
          styles.successRoot,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <View style={styles.successIcon}>
          <BadgeCheck color={colors.primary} size={36} />
        </View>
        <Text style={styles.successTitle}>Message sent</Text>
        <Text style={styles.successBody}>
          Thanks for reaching out to Uni Deals. Our team will review your
          message and get back to you within 24–48 hours.
        </Text>
        <Button
          label="Send another message"
          onPress={() => setIsSuccess(false)}
        />
        <Button label="Done" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Whether you have a question, want to host an event, or apply as a
          brand partner, we’re here to help. We aim to reply within 24–48 hours
          on business days.
        </Text>

        <FormField
          label="Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder="Jane Doe"
        />
        <FormField
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="jane@university.edu"
        />
        <Select
          label="Inquiry Type"
          value={inquiryType}
          options={INQUIRY_TYPE_OPTIONS}
          onChange={setInquiryType}
        />
        {showBrandField ? (
          <FormField
            label="Brand / Organization Name"
            value={brandName}
            onChangeText={setBrandName}
            placeholder="e.g. Uni Deals Society"
          />
        ) : null}
        <FormField
          label="Your Message"
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="How can we help you today?"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={isSubmitting ? "Sending…" : "Send message"}
          loading={isSubmitting}
          onPress={() => void handleSubmit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  error: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  successRoot: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    justifyContent: "center",
    gap: spacing.lg,
  },
  successIcon: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    color: colors.onBackground,
  },
  successBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
});
