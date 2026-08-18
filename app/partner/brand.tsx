import { useRouter, type Href } from "expo-router";
import { Store } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import {
  ImagePickerField,
  type PickedImage,
} from "@/components/ImagePickerField";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/AuthContext";
import { categoryOptionsFor } from "@/lib/brandForm";
import { usePartnerBrandProfile } from "@/lib/usePartnerBrandProfile";
import { colors, radius, spacing } from "@/theme";
import type { Brand } from "@/types/database";

export default function PartnerBrandScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    brands,
    isLoading,
    isRefreshing,
    saving,
    error,
    unlinkedName,
    refresh,
    updateBrand,
  } = usePartnerBrandProfile(user?.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [location, setLocation] = useState("");
  const [logo, setLogo] = useState<PickedImage | null>(null);
  const [success, setSuccess] = useState(false);

  const selected = useMemo(
    () => brands.find((brand) => brand.id === selectedId) ?? brands[0] ?? null,
    [brands, selectedId],
  );

  const applyBrand = useCallback((brand: Brand) => {
    setSelectedId(brand.id);
    setName(brand.name);
    setCategory(brand.category ?? "");
    setDescription(brand.description ?? "");
    setWebsiteUrl(brand.websiteUrl ?? "");
    setInstagramHandle(brand.instagramHandle ?? "");
    setTiktokHandle(brand.tiktokHandle ?? "");
    setLocation(brand.location ?? "");
    setLogo(null);
  }, []);

  useEffect(() => {
    if (brands.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillValid = Boolean(
      selectedId && brands.some((brand) => brand.id === selectedId),
    );
    if (!stillValid) {
      const first = brands[0];
      if (first) applyBrand(first);
    }
  }, [applyBrand, brands, selectedId]);

  const brandOptions = useMemo(
    () => brands.map((brand) => ({ value: brand.id, label: brand.name })),
    [brands],
  );

  const categoryOptions = useMemo(
    () => categoryOptionsFor(category),
    [category],
  );

  const handleSelectBrand = useCallback(
    (id: string) => {
      const next = brands.find((brand) => brand.id === id);
      if (!next) return;
      setSuccess(false);
      applyBrand(next);
    },
    [applyBrand, brands],
  );

  const handleSave = useCallback(async () => {
    if (!selected) return;
    setSuccess(false);
    const saveError = await updateBrand(selected.id, {
      name,
      category,
      description,
      websiteUrl,
      instagramHandle,
      tiktokHandle,
      location,
      logo,
      existingLogoUrl: selected.logoUrl,
    });
    if (!saveError) {
      setLogo(null);
      setSuccess(true);
    }
  }, [
    category,
    description,
    instagramHandle,
    location,
    logo,
    name,
    selected,
    tiktokHandle,
    updateBrand,
    websiteUrl,
  ]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!selected) {
    return (
      <View
        style={[
          styles.centered,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <View style={styles.emptyIcon}>
          <Store color={colors.primary} size={28} />
        </View>
        <Text style={styles.emptyTitle}>No brand linked</Text>
        <Text style={styles.emptyBody}>
          {error ||
            (unlinkedName
              ? `${unlinkedName} isn't linked to a brand record yet. Contact support so we can connect it.`
              : "This partner account isn't linked to a brand yet. Please contact support so we can connect it.")}
        </Text>
        <Button
          label="Contact support"
          onPress={() =>
            router.push({
              pathname: "/contact",
              params: { type: "partner" },
            } as Href)
          }
        />
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.lead}>
          These details appear with your deals. Students see your name, logo,
          and category on the public catalogue.
        </Text>

        {brands.length > 1 ? (
          <Select
            label="Brand"
            value={selected.id}
            options={brandOptions}
            onChange={handleSelectBrand}
          />
        ) : null}

        <ImagePickerField
          label="Logo"
          value={logo}
          previewUrl={selected.logoUrl}
          onChange={setLogo}
          aspect={[1, 1]}
          frameHeight={140}
          allowClear={Boolean(logo)}
          hint="JPG, PNG, or WEBP · max 5MB"
        />

        <FormField
          label="Brand Name"
          value={name}
          onChangeText={setName}
          placeholder="Your brand name"
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
          multiline
          placeholder="Short brand description"
        />
        <FormField
          label="Website URL"
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://"
        />
        <FormField
          label="Instagram"
          value={instagramHandle}
          onChangeText={setInstagramHandle}
          autoCapitalize="none"
          placeholder="@handle"
        />
        <FormField
          label="TikTok"
          value={tiktokHandle}
          onChangeText={setTiktokHandle}
          autoCapitalize="none"
          placeholder="@handle"
        />
        <FormField
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Colombo"
        />

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Brand profile updated successfully.
            </Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={saving ? "Saving…" : "Save changes"}
          loading={saving}
          onPress={() => void handleSave()}
        />
        <Button
          label="Done"
          variant="ghost"
          disabled={saving}
          onPress={() => router.back()}
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
  successBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
  },
  successText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    gap: spacing.lg,
  },
  emptyIcon: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    color: colors.onBackground,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
});
