import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { KeyboardFormScroll } from "@/components/KeyboardForm";
import { useKeyboardInset } from "@/components/KeyboardForm";
import { Select } from "@/components/Select";
import { PERK_CATEGORIES, type StudentPerk } from "@/lib/studentPerks";
import {
  useAdminStudentPerks,
  type StudentPerkInput,
} from "@/lib/useAdminStudentPerks";
import { colors, radius, spacing } from "@/theme";

const EMPTY_FORM: StudentPerkInput = {
  providerName: "",
  category: "",
  summary: "",
  eligibility: "",
  claimSteps: "",
  officialUrl: "https://",
  availability: "Sri Lanka",
  lastVerifiedOn: "",
  logoUrl: "",
  isActive: false,
};

function formFromPerk(perk: StudentPerk): StudentPerkInput {
  return {
    providerName: perk.providerName,
    category: perk.category ?? "",
    summary: perk.summary,
    eligibility: perk.eligibility ?? "",
    claimSteps: perk.claimSteps.join("\n"),
    officialUrl: perk.officialUrl,
    availability: perk.availability ?? "",
    lastVerifiedOn: perk.lastVerifiedOn ?? "",
    logoUrl: perk.logoUrl ?? "",
    isActive: perk.isActive,
  };
}

export default function AdminPerksScreen() {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const {
    perks,
    isLoading,
    isRefreshing,
    saving,
    unavailable,
    error,
    refresh,
    savePerk,
    setActive,
    movePerk,
    deletePerk,
  } = useAdminStudentPerks();
  const [editing, setEditing] = useState<StudentPerk | null | undefined>(undefined);
  const [form, setForm] = useState<StudentPerkInput>(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  const openEdit = (perk: StudentPerk) => {
    setForm(formFromPerk(perk));
    setEditing(perk);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={perks}
        keyExtractor={(perk) => perk.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.lead}>
              Perks are links to the provider. Hidden rows stay off Home, Deals,
              and the website until you show them. Use the provider's own page,
              not a referral link.
            </Text>
            {unavailable ? (
              <Text style={styles.banner}>
                Student perks are not live yet. Apply the student perks SQL in
                Supabase first.
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Add perk" onPress={openCreate} disabled={unavailable} />
          </View>
        }
        ListEmptyComponent={
          unavailable ? null : (
            <Text style={styles.empty}>No student perks yet.</Text>
          )
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.providerName}</Text>
            <Text style={styles.meta}>
              {item.isActive ? "Visible" : "Hidden"}
              {item.availability ? ` · ${item.availability}` : ""}
            </Text>
            <Text style={styles.summary} numberOfLines={3}>
              {item.summary}
            </Text>
            <View style={styles.actions}>
              <Button
                label={item.isActive ? "Hide" : "Show"}
                variant="secondary"
                disabled={saving}
                onPress={() => void setActive(item, !item.isActive)}
                style={styles.action}
              />
              <Button
                label="Edit"
                variant="secondary"
                disabled={saving}
                onPress={() => openEdit(item)}
                style={styles.action}
              />
            </View>
            <View style={styles.actions}>
              <Button
                label="Up"
                variant="ghost"
                disabled={saving || index === 0}
                onPress={() => void movePerk(item, -1)}
                style={styles.action}
              />
              <Button
                label="Down"
                variant="ghost"
                disabled={saving || index === perks.length - 1}
                onPress={() => void movePerk(item, 1)}
                style={styles.action}
              />
              <Button
                label="Delete"
                variant="ghost"
                disabled={saving}
                onPress={() => {
                  Alert.alert("Delete this perk?", item.providerName, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => void deletePerk(item.id),
                    },
                  ]);
                }}
                style={styles.action}
              />
            </View>
          </View>
        )}
      />

      <Modal
        visible={editing !== undefined}
        animationType="slide"
        onRequestClose={() => setEditing(undefined)}
      >
        <KeyboardFormScroll
          style={styles.root}
          contentContainerStyle={[
            styles.form,
            { paddingBottom: keyboardInset + insets.bottom + spacing.xxl },
          ]}
        >
          <Text style={styles.formTitle}>
            {editing ? "Edit perk" : "Add perk"}
          </Text>
          <FormField
            label="Provider name"
            value={form.providerName}
            onChangeText={(providerName) => setForm((prev) => ({ ...prev, providerName }))}
          />
          <Select
            label="Category"
            value={form.category}
            options={[
              { value: "", label: "Select category" },
              ...PERK_CATEGORIES.map((value) => ({ value, label: value })),
              ...(form.category &&
              !PERK_CATEGORIES.includes(form.category as (typeof PERK_CATEGORIES)[number])
                ? [{ value: form.category, label: form.category }]
                : []),
            ]}
            onChange={(category) => setForm((prev) => ({ ...prev, category }))}
          />
          <FormField
            label="Summary"
            value={form.summary}
            onChangeText={(summary) => setForm((prev) => ({ ...prev, summary }))}
            multiline
          />
          <FormField
            label="Who can claim it"
            value={form.eligibility}
            onChangeText={(eligibility) => setForm((prev) => ({ ...prev, eligibility }))}
            multiline
          />
          <FormField
            label="Claim steps"
            value={form.claimSteps}
            onChangeText={(claimSteps) => setForm((prev) => ({ ...prev, claimSteps }))}
            multiline
            hint="One step per line"
          />
          <FormField
            label="Official link"
            value={form.officialUrl}
            onChangeText={(officialUrl) => setForm((prev) => ({ ...prev, officialUrl }))}
            autoCapitalize="none"
            keyboardType="url"
          />
          <FormField
            label="Availability"
            value={form.availability}
            onChangeText={(availability) => setForm((prev) => ({ ...prev, availability }))}
            placeholder="Sri Lanka"
          />
          <FormField
            label="Last verified"
            value={form.lastVerifiedOn}
            onChangeText={(lastVerifiedOn) =>
              setForm((prev) => ({ ...prev, lastVerifiedOn }))
            }
            placeholder="2026-10-12"
            autoCapitalize="none"
          />
          <FormField
            label="Logo link"
            value={form.logoUrl}
            onChangeText={(logoUrl) => setForm((prev) => ({ ...prev, logoUrl }))}
            autoCapitalize="none"
            keyboardType="url"
            hint="Optional https image"
          />
          <Button
            label={form.isActive ? "Saving as visible" : "Saving as hidden"}
            variant="secondary"
            onPress={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={editing ? "Save perk" : "Add perk"}
            loading={saving}
            onPress={() => {
              void savePerk(form, editing?.id).then((saveError) => {
                if (!saveError) setEditing(undefined);
              });
            }}
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => setEditing(undefined)}
          />
        </KeyboardFormScroll>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
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
  error: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBackground,
  },
  meta: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onBackground,
  },
});
