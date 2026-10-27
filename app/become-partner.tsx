import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import {
  ImagePickerField,
  type PickedImage,
} from "@/components/ImagePickerField";
import { KeyboardFormScroll } from "@/components/KeyboardForm";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/AuthContext";
import { categoryOptionsFor } from "@/lib/brandForm";
import { uploadApplicationLogo } from "@/lib/brandLogoUpload";
import {
  submitBrandApplication,
  useBrandApplication,
  type BrandApplicationStatus,
} from "@/lib/useBrandApplication";
import { toErrorMessage } from "@/lib/supabase";
import { colors, radius, spacing } from "@/theme";

function statusBanner(status: BrandApplicationStatus, reason: string | null): string {
  if (status === "pending") {
    return "Your application is in review. You stay a student until an admin approves it. Saving again sends the latest version.";
  }
  if (status === "rejected") {
    return reason
      ? `The last application was declined: ${reason} Update the details and submit again.`
      : "The last application was declined. Update the details and submit again.";
  }
  if (status === "suspended") {
    return "This brand is suspended. Contact support if you think that's a mistake.";
  }
  return "This application was approved. Sign out and back in if the partner tools are not open yet.";
}

export default function BecomePartnerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role, refreshRole } = useAuth();
  const { application, isLoading, unavailable, error, refresh } =
    useBrandApplication(user?.id);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [location, setLocation] = useState("");
  const [logo, setLogo] = useState<PickedImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const categoryOptions = useMemo(
    () => categoryOptionsFor(category),
    [category],
  );

  useEffect(() => {
    if (!application) return;
    setName(application.name);
    setCategory(application.category ?? "");
    setDescription(application.description ?? "");
    setContactName(application.contactName ?? "");
    setContactPhone(application.contactPhone ?? "");
    setWebsiteUrl(application.websiteUrl ?? "");
    setInstagramHandle(application.instagramHandle ?? "");
    setTiktokHandle(application.tiktokHandle ?? "");
    setLocation(application.location ?? "");
  }, [application]);

  const handleSubmit = useCallback(async () => {
    if (!user?.id || submitting) return;
    setFormError(null);
    setSubmitted(false);
    setSubmitting(true);
    try {
      let logoUrl = application?.logoUrl ?? null;
      if (logo) {
        const uploaded = await uploadApplicationLogo({
          uri: logo.uri,
          userId: user.id,
          mimeType: logo.mimeType,
          fileSize: logo.fileSize,
        });
        logoUrl = uploaded.publicUrl;
      }

      await submitBrandApplication({
        name,
        contactName,
        contactPhone,
        category,
        description,
        websiteUrl,
        instagramHandle,
        tiktokHandle,
        location,
        logoUrl,
      });
      setLogo(null);
      setSubmitted(true);
      await refresh();
    } catch (caught) {
      setFormError(toErrorMessage(caught, "Couldn't submit your application."));
    } finally {
      setSubmitting(false);
    }
  }, [
    application?.logoUrl,
    category,
    contactName,
    contactPhone,
    description,
    instagramHandle,
    location,
    logo,
    name,
    refresh,
    submitting,
    tiktokHandle,
    user?.id,
    websiteUrl,
  ]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (role === "partner") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>You already have a partner account</Text>
        <Text style={styles.body}>
          Brand details are edited from your brand profile. Name and logo
          changes show to students as soon as you save them.
        </Text>
        <Button
          label="Open brand profile"
          onPress={() => router.replace("/partner/brand")}
        />
      </View>
    );
  }

  if (role === "admin") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Admins create brands directly</Text>
        <Text style={styles.body}>
          New brands from the brands screen go live immediately. Student
          applications wait in Brand applications.
        </Text>
        <Button
          label="Open brands"
          onPress={() => router.replace("/admin/brands")}
        />
      </View>
    );
  }

  const locked = application?.status === "suspended";

  return (
    <KeyboardFormScroll
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <Text style={styles.lead}>
        Tell us who you are and how to confirm the brand. We review every
        application. Your account stays a student until it is approved.
      </Text>

      {unavailable ? (
        <Text style={styles.banner}>
          Brand applications are not live yet. The database update still needs
          to be applied.
        </Text>
      ) : null}

      {application && !unavailable ? (
        <Text style={styles.banner}>
          {statusBanner(application.status, application.rejectionReason)}
        </Text>
      ) : null}

      {application?.status === "approved" ? (
        <Button
          label="Refresh partner access"
          onPress={() => void refreshRole()}
          variant="secondary"
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      {submitted ? (
        <Text style={styles.success}>
          Application sent. The status stays on your profile. You stay a
          student until an admin approves it.
        </Text>
      ) : null}

      <ImagePickerField
        label="Logo"
        value={logo}
        previewUrl={application?.logoUrl}
        onChange={setLogo}
        aspect={[1, 1]}
        frameHeight={140}
        allowClear={Boolean(logo)}
        hint="Optional. JPG, PNG, or WEBP · max 5MB"
      />

      <FormField
        label="Brand name"
        value={name}
        onChangeText={setName}
        placeholder="Your brand name"
        autoCapitalize="words"
      />
      <Select
        label="Category"
        value={category}
        options={categoryOptions}
        onChange={setCategory}
      />
      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="What students should know"
        multiline
      />
      <FormField
        label="Contact name"
        value={contactName}
        onChangeText={setContactName}
        placeholder="Who we should talk to"
        autoCapitalize="words"
      />
      <FormField
        label="Contact phone"
        value={contactPhone}
        onChangeText={setContactPhone}
        placeholder="07X XXX XXXX"
        keyboardType="phone-pad"
      />
      <FormField
        label="Website"
        value={websiteUrl}
        onChangeText={setWebsiteUrl}
        placeholder="https://yourbrand.com"
        autoCapitalize="none"
        keyboardType="url"
      />
      <FormField
        label="Instagram"
        value={instagramHandle}
        onChangeText={setInstagramHandle}
        placeholder="@brand"
        autoCapitalize="none"
      />
      <FormField
        label="TikTok"
        value={tiktokHandle}
        onChangeText={setTiktokHandle}
        placeholder="@brand"
        autoCapitalize="none"
      />
      <FormField
        label="Location"
        value={location}
        onChangeText={setLocation}
        placeholder="Colombo"
      />

      <Text style={styles.hint}>
        A website or one social profile is required. We use the contact details
        only to review the application.
      </Text>

      <Button
        label={application ? "Update application" : "Submit application"}
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={unavailable || locked || submitting}
      />
    </KeyboardFormScroll>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    color: colors.onBackground,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  banner: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
    color: colors.onPrimaryContainer,
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  success: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
    color: colors.onPrimaryContainer,
    fontSize: 14,
    lineHeight: 20,
  },
});
