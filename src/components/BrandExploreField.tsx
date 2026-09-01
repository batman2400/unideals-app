import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { useTabBarMotion } from "@/context/TabBarMotionContext";
import { resolveBrandExplore } from "@/lib/brandPath";
import { MIN_TAP_TARGET, colors, spacing } from "@/theme";

export function BrandExploreField({ brandNames }: { brandNames: string[] }) {
  const router = useRouter();
  const { openSearch } = useTabBarMotion();
  const [query, setQuery] = useState("");

  const goToDirectory = (searchQuery?: string) => {
    openSearch(undefined, {
      scope: "brands",
      query: searchQuery,
    });
  };

  const submit = () => {
    const target = resolveBrandExplore(query, brandNames);
    if (target.kind === "hub") {
      router.push(`/brand/${target.slug}` as Href);
      return;
    }
    goToDirectory(target.query);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Explore your favourite brands</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse all brands"
          hitSlop={8}
          onPress={() => goToDirectory()}
        >
          <Text style={styles.browse}>Browse all</Text>
        </Pressable>
      </View>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          placeholder="e.g. Spa Ceylon"
          placeholderTextColor={colors.inverseOnSurface}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={submit}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore brands"
          onPress={submit}
          hitSlop={8}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        >
          <ArrowRight color={colors.primary} size={26} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  browse: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: colors.onBackground,
    paddingVertical: spacing.xs,
  },
  arrow: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
});
