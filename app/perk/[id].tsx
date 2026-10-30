import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { PerkLogo } from "@/components/PerkLogo";
import {
  formatVerifiedOn,
  officialHttpsUrl,
  perkDisclaimer,
} from "@/lib/studentPerks";
import { useStudentPerk } from "@/lib/useStudentPerks";
import { colors, spacing } from "@/theme";

export default function PerkDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const perkId = Array.isArray(id) ? id[0] : id;
  const { perk, isLoading, error, refresh } = useStudentPerk(perkId);
  const [linkError, setLinkError] = useState<string | null>(null);

  if (isLoading && !perk) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!perk) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Perk unavailable</Text>
        <Text style={styles.body}>{error ?? "This perk may have been removed."}</Text>
        {error ? (
          <Button
            label="Try again"
            onPress={() => void refresh()}
            variant="secondary"
          />
        ) : null}
        <Button label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const verified = formatVerifiedOn(perk.lastVerifiedOn);
  const offerUrl = officialHttpsUrl(perk.officialUrl);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <View style={styles.header}>
        <PerkLogo providerName={perk.providerName} logoUrl={perk.logoUrl} size={56} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Global student perk</Text>
          <Text style={styles.title}>{perk.providerName}</Text>
          {perk.category ? <Text style={styles.category}>{perk.category}</Text> : null}
        </View>
      </View>

      <Text style={styles.summary}>{perk.summary}</Text>
      {perk.availability ? (
        <Text style={styles.meta}>Available: {perk.availability}</Text>
      ) : null}
      {verified ? <Text style={styles.meta}>Last verified on {verified}</Text> : null}

      {perk.eligibility ? (
        <View style={styles.block}>
          <Text style={styles.heading}>Who can claim it</Text>
          <Text style={styles.body}>{perk.eligibility}</Text>
        </View>
      ) : null}

      {perk.claimSteps.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.heading}>How to claim it</Text>
          {perk.claimSteps.map((step, index) => (
            <Text key={`${index}-${step}`} style={styles.body}>
              {index + 1}. {step}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={styles.disclaimer}>{perkDisclaimer(perk.providerName)}</Text>
      <Text style={styles.body}>
        Uni Deals does not check your eligibility or issue this offer. The
        provider's site and terms apply.
      </Text>

      {linkError ? <Text style={styles.error}>{linkError}</Text> : null}
      <Button
        label="Get this perk"
        disabled={!offerUrl}
        onPress={() => {
          if (!offerUrl) {
            setLinkError("This offer link is not available.");
            return;
          }
          void Linking.openURL(offerUrl).catch(() => {
            setLinkError("Couldn't open the provider's site.");
          });
        }}
      />
      {offerUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            void Linking.openURL(offerUrl).catch(() => {
              setLinkError("Couldn't open the provider's site.");
            });
          }}
        >
          <Text style={styles.url}>{offerUrl}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.onBackground,
  },
  category: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  summary: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.onBackground,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  block: {
    gap: spacing.xs,
  },
  heading: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onBackground,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
    textAlign: "left",
  },
  disclaimer: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  error: {
    color: colors.error,
    fontSize: 14,
  },
  url: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
});
