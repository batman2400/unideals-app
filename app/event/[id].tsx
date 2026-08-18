import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { Stack, useLocalSearchParams } from "expo-router";
import { Calendar, MapPin, Users } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import {
  formatEventWhen,
  formatLaunchDate,
  isComingSoonEvent,
} from "@/lib/eventTiming";
import { asHttpUrl } from "@/lib/httpUrl";
import { asRouteId } from "@/lib/routeParams";
import { useEvent } from "@/lib/useEvents";
import { colors, radius, spacing } from "@/theme";

function audienceLabel(value: string | null): string {
  switch (value) {
    case "university_only":
      return "University students only";
    case "high_school_only":
      return "High school students only";
    case "all_students":
      return "All students";
    default:
      return value?.replace(/_/g, " ") || "All students";
  }
}

export default function EventDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = asRouteId(rawId);
  const insets = useSafeAreaInsets();
  const { event, isLoading, error, refresh } = useEvent(id);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Event unavailable</Text>
        <Text style={styles.errorBody}>
          {error ?? "This event could not be found."}
        </Text>
        <Button label="Retry" onPress={() => void refresh()} />
      </View>
    );
  }

  const comingSoon = isComingSoonEvent(event);
  const registrationUrl = asHttpUrl(event.externalRegistrationUrl);

  return (
    <>
      <Stack.Screen options={{ title: event.title }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}
      >
        {event.coverImageUrl ? (
          <Image
            source={{ uri: event.coverImageUrl }}
            style={styles.cover}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Calendar color={colors.primary} size={36} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.badgeRow}>
            {event.category ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {event.category.replace(/_/g, " ")}
                </Text>
              </View>
            ) : null}
            {comingSoon ? (
              <View style={[styles.badge, styles.comingSoonBadge]}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{event.title}</Text>

          {(event.universityName || event.clubName) && (
            <Text style={styles.orgLine}>
              {[event.universityName, event.clubName].filter(Boolean).join(" · ")}
            </Text>
          )}

          <InfoRow
            icon={<Calendar color={colors.primary} size={18} />}
            label="When"
            value={formatEventWhen(event)}
          />
          <InfoRow
            icon={<MapPin color={colors.primary} size={18} />}
            label="Where"
            value={event.locationName || "Location TBA"}
          />
          <InfoRow
            icon={<Users color={colors.primary} size={18} />}
            label="Who can attend"
            value={audienceLabel(event.targetAudience)}
          />

          {event.description ? (
            <View style={styles.about}>
              <Text style={styles.aboutTitle}>About</Text>
              <Text style={styles.aboutBody}>{event.description}</Text>
            </View>
          ) : null}

          {comingSoon ? (
            <View style={styles.lockedCard}>
              <Text style={styles.lockedTitle}>Registration unlocks at go-live</Text>
              <Text style={styles.lockedBody}>
                This listing opens {formatLaunchDate(event.publishAt)}.
              </Text>
            </View>
          ) : registrationUrl ? (
            <Button
              label="Register Now"
              onPress={() => void Linking.openURL(registrationUrl)}
            />
          ) : (
            <View style={styles.lockedCard}>
              <Text style={styles.lockedTitle}>No registration link</Text>
              <Text style={styles.lockedBody}>
                Check back later or follow the organizer for details.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
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
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  cover: {
    width: "100%",
    height: 220,
    backgroundColor: colors.surfaceContainer,
  },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  comingSoonBadge: {
    backgroundColor: colors.info,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.white,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.onBackground,
  },
  orgLine: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onBackground,
  },
  about: {
    gap: spacing.sm,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onBackground,
  },
  aboutBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.onSurfaceVariant,
  },
  lockedCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainer,
    gap: spacing.xs,
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onBackground,
  },
  lockedBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onBackground,
  },
  errorBody: {
    fontSize: 14,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
});
