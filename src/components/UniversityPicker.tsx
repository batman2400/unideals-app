import { Check, ChevronDown, Plus, Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT, floatingTabBarBottomOffset } from "@/lib/tabBar";
import {
  OTHER_UNIVERSITY,
  customUniversityName,
  searchUniversities,
  shouldOfferCustomUniversity,
  type UniversityOption,
} from "@/lib/universities";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

interface UniversityPickerProps {
  universities: readonly UniversityOption[];
  value: string;
  otherName: string;
  onChange: (next: { value: string; otherName: string }) => void;
  label?: string;
}

export function UniversityPicker({
  universities,
  value,
  otherName,
  onChange,
  label = "University",
}: UniversityPickerProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => universities.find((uni) => uni.name === value) ?? null,
    [universities, value],
  );
  const isCustom = value === OTHER_UNIVERSITY && otherName.trim().length > 0;
  const displayName = isCustom ? otherName.trim() : (selected?.name ?? "");
  const results = useMemo(
    () => searchUniversities(universities, query),
    [query, universities],
  );
  const customName = customUniversityName(query);
  const offerCustom = shouldOfferCustomUniversity(universities, query);

  const tabClearance =
    floatingTabBarBottomOffset(insets.bottom) + TAB_BAR_HEIGHT + spacing.md;
  const availableHeight = Math.max(
    280,
    windowHeight - insets.top - tabClearance - spacing.sm,
  );
  const sheetHeight = Math.min(windowHeight * 0.84, availableHeight);

  const countLabel = query.trim()
    ? results.length === 1
      ? "1 match"
      : `${results.length} matches`
    : universities.length === 1
      ? "1 university"
      : `${universities.length} universities`;

  function close() {
    setOpen(false);
    setQuery("");
  }

  function chooseListed(name: string) {
    onChange({ value: name, otherName: "" });
    close();
  }

  function chooseCustom(name: string) {
    const trimmed = customUniversityName(name);
    if (trimmed.length < 2) return;
    onChange({ value: OTHER_UNIVERSITY, otherName: trimmed });
    close();
  }

  const domainHint = selected
    ? emailHint(selected.domains)
    : isCustom
      ? "Not in the list. Tap to change the name."
      : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          displayName ? `${label}, ${displayName}` : "Search your university"
        }
        onPress={() => {
          setQuery(isCustom ? otherName.trim() : "");
          setOpen(true);
        }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <View style={styles.triggerCopy}>
          <Text
            numberOfLines={1}
            style={[styles.triggerText, !displayName && styles.placeholder]}
          >
            {displayName || "Search your university"}
          </Text>
        </View>
        <ChevronDown color={colors.onSurfaceVariant} size={18} />
      </Pressable>
      {domainHint ? <Text style={styles.hint}>{domainHint}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.backdrop}>
          <Pressable
            accessibilityLabel="Close university list"
            style={StyleSheet.absoluteFill}
            onPress={close}
          />
          <View
            style={[
              styles.sheetWrap,
              { marginBottom: tabClearance, height: sheetHeight },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.sheetTitle}>Choose your university</Text>
                <Text style={styles.sheetMeta}>{countLabel}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                onPress={close}
                style={styles.closeBtn}
              >
                <X color={colors.onSurface} size={18} />
              </Pressable>
            </View>

            <View style={styles.searchBox}>
              <Search color={colors.onSurfaceVariant} size={18} />
              <TextInput
                accessibilityLabel="Search universities"
                autoCapitalize="words"
                autoCorrect={false}
                placeholder="Name, SLIIT, NSBM, or @cmb.ac.lk"
                placeholderTextColor={colors.inverseOnSurface}
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
              {query ? (
                <Pressable
                  accessibilityLabel="Clear search"
                  hitSlop={8}
                  onPress={() => setQuery("")}
                >
                  <X color={colors.onSurfaceVariant} size={16} />
                </Pressable>
              ) : null}
            </View>

            {offerCustom ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => chooseCustom(customName)}
                style={({ pressed }) => [
                  styles.addRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.addIcon}>
                  <Plus color={colors.primary} size={16} strokeWidth={2.4} />
                </View>
                <View style={styles.addCopy}>
                  <Text style={styles.addTitle} numberOfLines={2}>
                    Use “{customName}”
                  </Text>
                  <Text style={styles.addSub}>
                    Not listed — save this name with your verification
                  </Text>
                </View>
              </Pressable>
            ) : query.trim() ? null : (
              <Text style={styles.searchHint}>
                Search by name, short form, or email domain. Type the full name
                to add one that is missing.
              </Text>
            )}

            <FlatList
              data={results}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>
                    {universities.length === 0
                      ? "Universities are still loading"
                      : `No match for “${customName || query.trim()}”`}
                  </Text>
                  <Text style={styles.emptyBody}>
                    {universities.length === 0
                      ? "You can still type your university and add it above."
                      : offerCustom
                        ? "Check the spelling, or add that name with the button above."
                        : "Try a name, a short form like SLIIT, or an email domain."}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isActive = item.name === value;
                const domains = item.domains
                  .slice(0, 2)
                  .map((domain) => `@${domain}`)
                  .join("  ·  ");
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => chooseListed(item.name)}
                    style={({ pressed }) => [
                      styles.option,
                      isActive && styles.optionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[styles.radio, isActive && styles.radioOn]}
                    >
                      {isActive ? (
                        <Check
                          color={colors.onPrimary}
                          size={12}
                          strokeWidth={3}
                        />
                      ) : null}
                    </View>
                    <View style={styles.optionCopy}>
                      <HighlightedName name={item.name} query={query} />
                      {domains ? (
                        <Text style={styles.domain} numberOfLines={1}>
                          {domains}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function emailHint(domains: readonly string[]): string | null {
  const listed = domains.filter(Boolean);
  if (!listed.length) return "Tap to change your university.";
  if (listed.length === 1) return `Use an @${listed[0]} email.`;
  return `Use an @${listed[0]} or @${listed[1]} email.`;
}

function HighlightedName({ name, query }: { name: string; query: string }) {
  const needle = query.trim();
  const index =
    needle.length >= 2 ? name.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (index < 0) {
    return (
      <Text style={styles.optionText} numberOfLines={2}>
        {name}
      </Text>
    );
  }
  return (
    <Text style={styles.optionText} numberOfLines={2}>
      {name.slice(0, index)}
      <Text style={styles.optionHit}>
        {name.slice(index, index + needle.length)}
      </Text>
      {name.slice(index + needle.length)}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  trigger: {
    minHeight: MIN_TAP_TARGET + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  triggerCopy: {
    flex: 1,
  },
  triggerText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurface,
  },
  placeholder: {
    fontWeight: "500",
    color: colors.inverseOnSurface,
  },
  pressed: {
    opacity: 0.88,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 24, 23, 0.46)",
    justifyContent: "flex-end",
  },
  sheetWrap: {
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainerLowest,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceVariant,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBackground,
  },
  sheetMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceContainerLow,
  },
  searchBox: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  searchHint: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.xs,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  addCopy: {
    flex: 1,
    gap: 2,
  },
  addTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  addSub: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingBottom: spacing.sm,
    flexGrow: 1,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  optionActive: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderBottomColor: "transparent",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurface,
  },
  optionHit: {
    color: colors.primary,
    fontWeight: "800",
  },
  domain: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  empty: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onBackground,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
});
