import { Check, ChevronDown, Search, X } from "lucide-react-native";
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
  searchUniversities,
  type UniversityOption,
} from "@/lib/universities";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

interface UniversityPickerProps {
  universities: readonly UniversityOption[];
  value: string;
  onChange: (name: string) => void;
  label?: string;
  /** Switches to student-ID review when the university is not on the list. */
  onNotListed?: (query: string) => void;
}

export function UniversityPicker({
  universities,
  value,
  onChange,
  label = "University",
  onNotListed,
}: UniversityPickerProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => universities.find((uni) => uni.name === value) ?? null,
    [universities, value],
  );
  const displayName = selected?.name ?? "";
  const results = useMemo(
    () => searchUniversities(universities, query),
    [query, universities],
  );

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
    onChange(name);
    close();
  }

  function useManualVerification() {
    onNotListed?.(query.trim().replace(/\s+/g, " "));
    close();
  }

  const domainHint = selected ? emailHint(selected.domains) : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          displayName ? `${label}, ${displayName}` : "Search your university"
        }
        onPress={() => {
          setQuery("");
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

            {query.trim() ? null : (
              <Text style={styles.searchHint}>
                Search by name, short form, or email domain.
                {onNotListed
                  ? " If yours is not listed, verify with a student ID."
                  : ""}
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
                      : `No match for “${query.trim()}”`}
                  </Text>
                  <Text style={styles.emptyBody}>
                    {universities.length === 0
                      ? "The list will appear here in a moment."
                      : onNotListed
                        ? "This university is not on the email list. Upload your student ID and an admin will review it."
                        : "Try a name, a short form like SLIIT, or an email domain."}
                  </Text>
                  {onNotListed && universities.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={useManualVerification}
                      style={({ pressed }) => [
                        styles.manualBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.manualBtnLabel}>
                        Continue with student ID
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              }
              ListFooterComponent={
                onNotListed && results.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={useManualVerification}
                    style={styles.manualLink}
                  >
                    <Text style={styles.manualLinkLabel}>
                      University not listed? Verify with a student ID
                    </Text>
                  </Pressable>
                ) : null
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
  manualBtn: {
    marginTop: spacing.sm,
    minHeight: MIN_TAP_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  manualBtnLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  manualLink: {
    minHeight: MIN_TAP_TARGET,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
  manualLinkLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});
