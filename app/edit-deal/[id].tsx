import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  getOfferValueLabel,
  getOfferValuePlaceholder,
  isOfferValueRequired,
  OFFER_TYPE_OPTIONS,
  isoToDate,
  parseOfferLabel,
  validateOfferValue,
  validateSchedule,
  type DealCategory,
} from "@/lib/dealForm";
import { uploadDealImage } from "@/lib/dealImageUpload";
import { asHttpUrl } from "@/lib/httpUrl";
import { asRouteId } from "@/lib/routeParams";
import { supabase, toErrorMessage } from "@/lib/supabase";
import {
  PARTNER_BRAND_REQUIRED_MESSAGE,
  usePartnerBrand,
} from "@/lib/usePartnerBrand";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { colors, spacing } from "@/theme";
import type { DealOfferType, DealType } from "@/types/database";
import { OFFICIAL_DEAL_CATEGORIES } from "@/types/database";

function asDealCategory(value: string | null | undefined): DealCategory {
  if (
    value &&
    (OFFICIAL_DEAL_CATEGORIES as readonly string[]).includes(value)
  ) {
    return value as DealCategory;
  }
  return "Fashion";
}

function asDealType(value: string | null | undefined): DealType {
  return value === "In-Store" ? "In-Store" : "Online";
}

export default function EditDealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const dealId = Number(asRouteId(params.id));
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
  const [redemptionCode, setRedemptionCode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [image, setImage] = useState<PickedImage | null>(null);
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [storeUrl, setStoreUrl] = useState("");
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const offerPreview = useMemo(
    () => buildOfferLabel(offerType, offerValue),
    [offerType, offerValue],
  );

  const formKey = useMemo(
    () =>
      JSON.stringify({
        title,
        description,
        category,
        dealType,
        offerType,
        offerValue,
        redemptionCode,
        storeUrl,
        startAt: startAt?.getTime() ?? null,
        endAt: endAt?.getTime() ?? null,
        showStartDate,
        showEndDate,
        imageUri: image?.uri ?? "",
      }),
    [
      title,
      description,
      category,
      dealType,
      offerType,
      offerValue,
      redemptionCode,
      storeUrl,
      startAt,
      endAt,
      showStartDate,
      showEndDate,
      image,
    ],
  );
  const baselineRef = useRef<string | null>(null);
  const isDirty = Boolean(
    hydrated && baselineRef.current && formKey !== baselineRef.current,
  );
  const allowLeave = useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    let active = true;

    async function loadDeal() {
      if (!Number.isFinite(dealId) || dealId < 1) {
        setError("Invalid offer id.");
        setIsLoading(false);
        return;
      }
      if (brandLoading) return;
      if (!brandName || !user) {
        setError(brandError ?? PARTNER_BRAND_REQUIRED_MESSAGE);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("deals")
        .select(
          "id, title, brand, discount, type, category, image_url, description, redemption_code, store_url, start_time, end_time, show_start_date, show_end_date",
        )
        .eq("id", dealId);

      query = brandId
        ? query.or(`brand_id.eq.${brandId},partner_id.eq.${user.id}`)
        : query.eq("partner_id", user.id);

      const { data, error: fetchError } = await query.maybeSingle();

      if (!active) return;

      if (fetchError) {
        setError(toErrorMessage(fetchError, "Failed to load offer."));
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError("Offer not found or you do not have access to edit it.");
        setIsLoading(false);
        return;
      }

      const parsed = parseOfferLabel(String(data.discount ?? ""));
      const start = isoToDate(data.start_time as string | null);
      const end = isoToDate(data.end_time as string | null);
      const nextTitle = String(data.title ?? "");
      const nextDescription = String(data.description ?? "");
      const nextCategory = asDealCategory(data.category as string | null);
      const nextType = asDealType(data.type as string | null);
      const nextCode = String(data.redemption_code ?? "").toUpperCase();
      const nextStoreUrl = String(data.store_url ?? "");
      const nextShowStart = Boolean(data.show_start_date);
      const nextShowEnd = Boolean(data.show_end_date);

      setTitle(nextTitle);
      setDescription(nextDescription);
      setCategory(nextCategory);
      setDealType(nextType);
      setOfferType(parsed.offerType);
      setOfferValue(parsed.offerValue);
      setRedemptionCode(nextCode);
      setImageUrl(String(data.image_url ?? ""));
      setStoreUrl(nextStoreUrl);
      setStartAt(start);
      setEndAt(end);
      setShowStartDate(nextShowStart);
      setShowEndDate(nextShowEnd);
      baselineRef.current = JSON.stringify({
        title: nextTitle,
        description: nextDescription,
        category: nextCategory,
        dealType: nextType,
        offerType: parsed.offerType,
        offerValue: parsed.offerValue,
        redemptionCode: nextCode,
        storeUrl: nextStoreUrl,
        startAt: start?.getTime() ?? null,
        endAt: end?.getTime() ?? null,
        showStartDate: nextShowStart,
        showEndDate: nextShowEnd,
        imageUri: "",
      });
      setHydrated(true);
      setIsLoading(false);
    }

    void loadDeal();
    return () => {
      active = false;
    };
  }, [dealId, brandId, brandName, brandLoading, brandError, user]);

  const handleOfferTypeChange = useCallback((next: DealOfferType) => {
    setOfferType(next);
    if (!isOfferValueRequired(next)) {
      setOfferValue("");
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (inFlightRef.current) return;

    setError(null);
    setSuccess(null);

    if (!user || !brandName) {
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
    if (!redemptionCode.trim()) {
      setError("Redemption code is required.");
      return;
    }
    if (!image && !imageUrl.trim()) {
      setError("Please upload an image or keep the existing one.");
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
    setIsSaving(true);

    try {
      let effectiveImageUrl = imageUrl.trim();
      if (image) {
        const uploaded = await uploadDealImage({
          uri: image.uri,
          userId: user.id,
          brandName,
          mimeType: image.mimeType,
          fileSize: image.fileSize,
        });
        effectiveImageUrl = uploaded.publicUrl;
      }

      const payload = {
        title: title.trim(),
        brand: brandName,
        brand_id: brandId,
        discount: offerPreview,
        type: dealType,
        category,
        image_url: effectiveImageUrl,
        description:
          description.trim() || `${title.trim()} student offer.`,
        redemption_code: redemptionCode.trim().toUpperCase(),
        store_url: storeUrlValue,
        start_time: startIso,
        end_time: endIso,
        show_start_date: showStartDate,
        show_end_date: showEndDate,
      };

      let updateQuery = supabase
        .from("deals")
        .update(payload)
        .eq("id", dealId);

      updateQuery = brandId
        ? updateQuery.or(`brand_id.eq.${brandId},partner_id.eq.${user.id}`)
        : updateQuery.eq("partner_id", user.id);

      const { data, error: updateError } = await updateQuery
        .select("id")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!data) {
        setError("Update blocked. You can only edit your own brand offers.");
        return;
      }

      setImageUrl(effectiveImageUrl);
      setImage(null);
      setSuccess("Offer updated successfully.");
      allowLeave();
      Alert.alert("Saved", "Offer updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (caught) {
      const code =
        caught && typeof caught === "object" && "code" in caught
          ? String((caught as { code?: string }).code)
          : null;
      if (code === "23505") {
        setError(
          "Promo code already exists for this brand. Please use a unique code.",
        );
      } else {
        setError(toErrorMessage(caught, "Could not update offer."));
      }
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, [
    user,
    brandId,
    brandName,
    brandError,
    title,
    offerPreview,
    redemptionCode,
    image,
    imageUrl,
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
    dealId,
    allowLeave,
    router,
  ]);

  if (isLoading || brandLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading offer editor…</Text>
      </View>
    );
  }

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
          Update your offer details for {brandName || "your brand"}.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <FormField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Enter deal title"
        />
        <View style={styles.brandBox}>
          <Text style={styles.brandLabel}>Brand</Text>
          <Text style={styles.brandValue}>{brandName || "Not assigned"}</Text>
        </View>

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
        <Select
          label="Category"
          value={category}
          options={DEAL_CATEGORY_OPTIONS}
          onChange={setCategory}
        />

        {offerPreview ? (
          <View style={styles.previewPill}>
            <Text style={styles.previewLabel}>Offer preview</Text>
            <Text style={styles.previewValue}>{offerPreview}</Text>
          </View>
        ) : null}

        <DateTimeField
          label="Start / launch"
          value={startAt}
          onChange={setStartAt}
          optional
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

        <ImagePickerField
          label="Deal Image"
          value={image}
          previewUrl={imageUrl || null}
          onChange={setImage}
          hint="Optional: upload a new JPG, PNG, or WEBP (max 5MB)."
        />

        <FormField
          label="Description (Optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Add short terms or leave empty."
          multiline
        />
        <FormField
          label="Redemption Code"
          value={redemptionCode}
          onChangeText={(text) => setRedemptionCode(text.toUpperCase())}
          autoCapitalize="characters"
          hint="Must be unique for your brand."
        />

        <Button
          label={isSaving ? "Saving…" : "Save Changes"}
          loading={isSaving}
          onPress={() => void handleSubmit()}
        />
        <Button
          label="Cancel"
          variant="ghost"
          onPress={() => router.back()}
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
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
  success: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
});
