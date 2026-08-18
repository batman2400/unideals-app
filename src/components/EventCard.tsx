import { Image } from "expo-image";
import { Calendar, MapPin } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  formatEventWhen,
  formatLaunchRelative,
  isComingSoonEvent,
} from "@/lib/eventTiming";
import { colors, radius, spacing } from "@/theme";
import type { CampusEvent } from "@/types/database";

interface EventCardProps {
  event: CampusEvent;
  onPress?: (event: CampusEvent) => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const comingSoon = isComingSoonEvent(event);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={event.title}
      onPress={() => onPress?.(event)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {event.coverImageUrl ? (
          <Image
            source={{ uri: event.coverImageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Calendar color={colors.primary} size={28} />
          </View>
        )}
        {event.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {event.category.replace(/_/g, " ")}
            </Text>
          </View>
        ) : null}
        {comingSoon ? (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>
              {formatLaunchRelative(event.publishAt)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.when} numberOfLines={1}>
          {formatEventWhen(event)}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        {event.locationName ? (
          <View style={styles.metaRow}>
            <MapPin color={colors.onSurfaceVariant} size={14} />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.locationName}
            </Text>
          </View>
        ) : null}
        {event.universityName ? (
          <Text style={styles.university} numberOfLines={1}>
            {event.universityName}
            {event.clubName ? ` · ${event.clubName}` : ""}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.9,
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 150,
    backgroundColor: colors.surfaceContainer,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: "rgba(252,249,248,0.92)",
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.onBackground,
  },
  comingSoonBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.info,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  when: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.primary,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onBackground,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  university: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
});
