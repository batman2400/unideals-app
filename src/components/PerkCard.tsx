import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  formatVerifiedOn,
  perkDisclaimer,
  perkLogoUrl,
  type StudentPerk,
} from "@/lib/studentPerks";
import { colors, radius, spacing } from "@/theme";

interface PerkCardProps {
  perk: StudentPerk;
  onPress: () => void;
  variant?: "row" | "carousel";
}

export function PerkCard({ perk, onPress, variant = "row" }: PerkCardProps) {
  const verified = formatVerifiedOn(perk.lastVerifiedOn);
  const carousel = variant === "carousel";
  const logoUrl = perkLogoUrl(perk);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={perk.providerName}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        carousel && styles.carousel,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="contain" />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoLetter}>
              {perk.providerName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.titleWrap}>
          <Text style={styles.provider} numberOfLines={2}>
            {perk.providerName}
          </Text>
          {perk.category ? (
            <Text style={styles.category}>{perk.category}</Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.summary} numberOfLines={carousel ? 3 : 4}>
        {perk.summary}
      </Text>
      {perk.availability ? (
        <Text style={styles.meta}>{perk.availability}</Text>
      ) : null}
      {verified ? <Text style={styles.meta}>Last verified on {verified}</Text> : null}
      <Text style={styles.disclaimer}>{perkDisclaimer(perk.providerName)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  carousel: {
    width: 260,
  },
  pressed: {
    opacity: 0.85,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceVariant,
  },
  logoFallback: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  logoLetter: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  provider: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onBackground,
  },
  category: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },
});
