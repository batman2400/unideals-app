import { Image } from "expo-image";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
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
import {
  BRAND_CATEGORIES,
  useAdminBrands,
} from "@/lib/useAdminBrands";
import { colors, radius, spacing } from "@/theme";
import type { Brand } from "@/types/database";

type CategoryValue = (typeof BRAND_CATEGORIES)[number] | "";

const CATEGORY_OPTIONS = [
  { value: "" as const, label: "Select category" },
  ...BRAND_CATEGORIES.map((value) => ({ value, label: value })),
];

function BrandCard({
  brand,
  onEdit,
  onDelete,
}: {
  brand: Brand;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.logo}>
          {brand.logoUrl ? (
            <Image
              source={{ uri: brand.logoUrl }}
              style={styles.logoImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Building2 color={colors.onSurfaceVariant} size={22} />
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{brand.name}</Text>
          <Text style={styles.category}>
            {brand.category || "Uncategorized"}
          </Text>
          {brand.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {brand.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.editBtn,
            pressed && styles.pressed,
          ]}
        >
          <Pencil color={colors.onBackground} size={14} />
          <Text style={styles.editLabel}>Edit</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.deleteBtn,
            pressed && styles.pressed,
          ]}
        >
          <Trash2 color={colors.error} size={14} />
          <Text style={styles.deleteLabel}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminBrandsScreen() {
  const insets = useSafeAreaInsets();
  const {
    brands,
    isLoading,
    isRefreshing,
    saving,
    error,
    message,
    refresh,
    createBrand,
    updateBrand,
    deleteBrand,
  } = useAdminBrands();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryValue>("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [logo, setLogo] = useState<PickedImage | null>(null);

  const canSave = useMemo(() => name.trim().length > 0, [name]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setCategory("");
    setDescription("");
    setWebsiteUrl("");
    setInstagramHandle("");
    setTiktokHandle("");
    setLogo(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setName(brand.name);
    setCategory((brand.category as CategoryValue) || "");
    setDescription(brand.description ?? "");
    setWebsiteUrl(brand.websiteUrl ?? "");
    setInstagramHandle(brand.instagramHandle ?? "");
    setTiktokHandle(brand.tiktokHandle ?? "");
    setLogo(null);
    setModalOpen(true);
  };

  const onSave = () => {
    if (!canSave) {
      Alert.alert("Missing name", "Brand name is required.");
      return;
    }

    const input = {
      name,
      category,
      description,
      websiteUrl,
      instagramHandle,
      tiktokHandle,
      logo,
      existingLogoUrl: editing?.logoUrl ?? null,
    };

    void (async () => {
      const saveError = editing
        ? await updateBrand(editing.id, input)
        : await createBrand(input);
      if (!saveError) {
        setModalOpen(false);
        resetForm();
      }
    })();
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={brands}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              <Text style={styles.subtitle}>
                Manage partner brands, logos, and social handles.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={openCreate}
                style={({ pressed }) => [
                  styles.newBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Plus color={colors.onPrimary} size={18} />
                <Text style={styles.newBtnLabel}>New</Text>
              </Pressable>
            </View>
            {message ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyBody}>No brands yet.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <BrandCard
            brand={item}
            onEdit={() => openEdit(item)}
            onDelete={() => {
              Alert.alert(
                "Delete brand?",
                `Delete "${item.name}"? This cannot be undone.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      void deleteBrand(item.id);
                    },
                  },
                ],
              );
            }}
          />
        )}
      />

      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={[styles.modalRoot, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editing ? "Edit Brand" : "Create Brand"}
            </Text>
            <Pressable onPress={() => setModalOpen(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[
              styles.modalBody,
              { paddingBottom: insets.bottom + spacing.xxl },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <FormField
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Brand name"
            />
            <Select
              label="Category"
              value={category}
              options={CATEGORY_OPTIONS}
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
            <ImagePickerField
              label="Logo"
              value={logo}
              previewUrl={editing?.logoUrl}
              onChange={setLogo}
            />
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setModalOpen(false)}
                style={styles.modalBtn}
              />
              <Button
                label={editing ? "Save Changes" : "Create Brand"}
                loading={saving}
                disabled={!canSave}
                onPress={onSave}
                style={styles.modalBtn}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerBlock: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  subtitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  newBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  newBtnLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onPrimary,
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
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.errorContainer,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onErrorContainer,
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
  },
  emptyBody: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    gap: spacing.md,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainerLow,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onBackground,
  },
  category: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  editBtn: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onBackground,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  deleteLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.error,
  },
  pressed: {
    opacity: 0.75,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBackground,
  },
  modalClose: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});
