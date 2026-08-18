import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { DateTimeField } from "@/components/DateTimeField";
import { FormField } from "@/components/FormField";
import {
  ImagePickerField,
  type PickedImage,
} from "@/components/ImagePickerField";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/AuthContext";
import {
  buildOfferLabel,
  DEAL_CATEGORY_OPTIONS,
  DEAL_TYPE_OPTIONS,
  generateRedemptionCode,
  getOfferValueLabel,
  getOfferValuePlaceholder,
  isOfferValueRequired,
  OFFER_TYPE_OPTIONS,
  validateOfferValue,
  validateSchedule,
  type DealCategory,
} from "@/lib/dealForm";
import { uploadDealImage } from "@/lib/dealImageUpload";
import { asHttpUrl } from "@/lib/httpUrl";
import { supabase, toErrorMessage } from "@/lib/supabase";
import {
  PARTNER_BRAND_REQUIRED_MESSAGE,
  usePartnerBrand,
} from "@/lib/usePartnerBrand";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { colors, spacing } from "@/theme";
import type { DealOfferType, DealType } from "@/types/database";

export default function CreateDealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const inFlightRef = useRef(false);

  const {
    brandId,
    brandName,
    isLoading: brandLoading,
    error: brandError,
  } = usePartnerBrand(user?.id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DealCategory>("Fashion");
  const [dealType, setDealType] = useState<DealType>("Online");
  const [offerType, setOfferType] = useState<DealOfferType>("percentage_off");
  const [offerValue, setOfferValue] = useState("");
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [image, setImage] = useState<PickedImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const offerPreview = useMemo(
    () => buildOfferLabel(offerType, offerValue),
    [offerType, offerValue],
  );

  const isDirty = useMemo(
    () =>
      Boolean(
        title.trim() ||
          description.trim() ||
          offerValue.trim() ||
          storeUrl.trim() ||
          startAt ||
          endAt ||
          image ||
          dealType !== "Online" ||
          offerType !== "percentage_off" ||
          category !== "Fashion" ||
          showStartDate ||
          showEndDate,
      ),
    [
      title,
      description,
      offerValue,
      storeUrl,
      startAt,
      endAt,
      image,
      dealType,
      offerType,
      category,
      showStartDate,
      showEndDate,
    ],
  );
  const allowLeave = useUnsavedChangesGuard(isDirty);

  const handleOfferTypeChange = useCallback((next: DealOfferType) => {
    setOfferType(next);
    if (!isOfferValueRequired(next)) {
      setOfferValue("");
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (inFlightRef.current) return;

    setError(null);

    if (!user) {
      setError("You must be signed in to create a deal.");
      return;
    }
    if (brandLoading) {
      setError("Please wait while we verify your partner brand.");
      return;
    }
    if (!brandName) {
      setError(brandError ?? PARTNER_BRAND_REQUIRED_MESSAGE);
      return;
    }
    if (!title.trim()) {
      setError("Deal title is required.");
      return;
    }
    const offerError = validateOfferValue(offerType, offerValue);
    if (offerError) {
      setError(offerError);
      return;
    }
    if (!offerPreview.trim()) {
      setError("Please choose the offer details.");
      return;
    }
    if (!image) {
      setError("Please upload a deal image.");
      return;
    }

    let storeUrlValue: string | null = null;
    if (dealType === "Online" && storeUrl.trim()) {
      storeUrlValue = asHttpUrl(storeUrl);
      if (!storeUrlValue) {
        setError("Store URL must be a valid http or https link.");
        return;
      }
    }

    const scheduleError = validateSchedule(startAt, endAt);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }

    const startIso = (startAt ?? new Date()).toISOString();
    const endIso = endAt ? endAt.toISOString() : null;

    inFlightRef.current = true;
    setIsSubmitting(true);

    try {
      setSubmitStage("Uploading image…");
      const { publicUrl } = await uploadDealImage({
        uri: image.uri,
        userId: user.id,
        brandName,
        mimeType: image.mimeType,
        fileSize: image.fileSize,
      });

      const payload = {
        title: title.trim(),
        brand: brandName,
        brand_id: brandId,
        discount: offerPreview,
        type: dealType,
        category,
        image_url: publicUrl,
        description:
          description.trim() || `${title.trim()} student offer.`,
        redemption_code: generateRedemptionCode(),
        partner_id: user.id,
        status: "approved",
        store_url: storeUrlValue,
        start_time: startIso,
        end_time: endIso,
        show_start_date: showStartDate,
        show_end_date: showEndDate,
      };

      setSubmitStage("Saving deal…");
      const { error: insertError } = await supabase
        .from("deals")
        .insert([payload]);

      if (insertError) throw insertError;

      const scheduledForLater = !!startAt && startAt.getTime() > Date.now();

      allowLeave();
      Alert.alert(
        "Deal published",
        scheduledForLater
          ? "Students will see it as Coming Soon until the start date."
          : "It's now visible to students.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (caught) {
      const code =
        caught && typeof caught === "object" && "code" in caught
          ? String((caught as { code?: string }).code)
          : null;
      if (code === "23505") {
        setError(
          "Promo code already exists for this brand. Please try again.",
        );
      } else {
        setError(toErrorMessage(caught, "Could not publish deal."));
      }
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
      setSubmitStage("");
    }
  }, [
    user,
    brandLoading,
    brandName,
    brandId,
    brandError,
    title,
    offerPreview,
    image,
    storeUrl,
    startAt,
    endAt,
    dealType,
    offerType,
    offerValue,
    category,
    description,
    showStartDate,
    showEndDate,
    allowLeave,
    router,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Complete the fields below and publish. Students will see the deal
          immediately, or as Coming Soon if you set a future start date.
        </Text>

        {(brandError || (!brandLoading && !brandName)) && (
          <Text style={styles.error}>
            {brandError ?? PARTNER_BRAND_REQUIRED_MESSAGE}
          </Text>
        )}

        <Text style={styles.section}>1. Deal information</Text>
        <FormField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Enter deal title"
        />
        <View style={styles.brandBox}>
          <Text style={styles.brandLabel}>Brand</Text>
          <Text style={styles.brandValue}>
            {brandLoading
              ? "Loading partner brand…"
              : brandName || "Not assigned"}
          </Text>
          <Text style={styles.brandHint}>Assigned by admin.</Text>
        </View>
        <Select
          label="Category"
          value={category}
          options={DEAL_CATEGORY_OPTIONS}
          onChange={setCategory}
        />
        <FormField
          label="Description (Optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Add short terms or leave empty."
          multiline
        />

        <Text style={styles.section}>2. Offer details</Text>
        <Select
          label="Offer Type"
          value={offerType}
          options={OFFER_TYPE_OPTIONS}
          onChange={handleOfferTypeChange}
        />
        {isOfferValueRequired(offerType) ? (
          <FormField
            label={getOfferValueLabel(offerType)}
            value={offerValue}
            onChangeText={setOfferValue}
            placeholder={getOfferValuePlaceholder(offerType)}
          />
        ) : (
          <View style={styles.brandBox}>
            <Text style={styles.brandLabel}>Offer Value</Text>
            <Text style={styles.brandValue}>Buy 1 Get 1</Text>
          </View>
        )}
        <Select
          label="Type"
          value={dealType}
          options={DEAL_TYPE_OPTIONS}
          onChange={setDealType}
        />
        {dealType === "Online" ? (
          <FormField
            label="Store URL (optional)"
            value={storeUrl}
            onChangeText={setStoreUrl}
            placeholder="https://shop.example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint="Students can open this after revealing the promo code."
          />
        ) : null}
        {offerPreview ? (
          <View style={styles.previewPill}>
            <Text style={styles.previewLabel}>Offer preview</Text>
            <Text style={styles.previewValue}>{offerPreview}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>3. Launch schedule</Text>
        <DateTimeField
          label="Start / launch"
          value={startAt}
          onChange={setStartAt}
          optional
          hint="Leave empty to go live immediately. A future date shows as Coming Soon."
        />
        <ToggleRow
          label="Show start / launch date to students after it goes live"
          value={showStartDate}
          onChange={setShowStartDate}
        />
        <DateTimeField
          label="End"
          value={endAt}
          onChange={setEndAt}
          optional
          hint="Leave empty for no end date."
        />
        <ToggleRow
          label="Show end date to students"
          value={showEndDate}
          onChange={setShowEndDate}
        />

        <Text style={styles.section}>4. Deal image</Text>
        <ImagePickerField label="Cover Image" value={image} onChange={setImage} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={
            isSubmitting
              ? submitStage || "Submitting…"
              : "Publish deal"
          }
          loading={isSubmitting}
          disabled={brandLoading || !brandName}
          onPress={() => void handleSubmit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.toggleRow}
    >
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
        thumbColor={value ? colors.primary : colors.surfaceContainerHighest}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  section: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onBackground,
    marginTop: spacing.sm,
  },
  brandBox: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  brandValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurface,
  },
  brandHint: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  previewPill: {
    gap: 4,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.primaryContainer,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onPrimaryContainer,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  error: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
});
