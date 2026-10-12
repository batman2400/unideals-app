import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { PerkLogo } from "@/components/PerkLogo";
import {
  formatVerifiedOn,
  officialHttpsUrl,
  perkDisclaimer,
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
  const offerUrl = officialHttpsUrl(perk.officialUrl);

  return (
    <View style={[styles.card, carousel && styles.carousel]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={perk.providerName}
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
      <View style={styles.top}>
        <PerkLogo providerName={perk.providerName} logoUrl={perk.logoUrl} />
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
      {offerUrl ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Get ${perk.providerName}`}
          onPress={() => {
            void Linking.openURL(offerUrl);
          }}
          style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
        >
          <Text style={styles.linkLabel}>Get this perk</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>
            {offerUrl}
          </Text>
        </Pressable>
      ) : null}
    </View>
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
  body: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
  linkButton: {
    gap: 2,
    paddingVertical: spacing.xs,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  linkUrl: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
});
