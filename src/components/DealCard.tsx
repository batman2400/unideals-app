import { Image } from "expo-image";
import { Clock, Heart, Store, Tag } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  formatDealVisibleSchedule,
  formatLaunchRelative,
  isComingSoonDeal,
  isExpiredDeal,
} from "@/lib/eventTiming";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import type { Deal } from "@/types/database";

interface DealCardProps {
  deal: Deal;
  onPress?: (deal: Deal) => void;
  saved?: boolean;
  saveDisabled?: boolean;
  onToggleSave?: (dealId: number) => void | Promise<void>;
}

export function SaveDealButton({
  saved,
  disabled,
  onPress,
  variant = "card",
}: {
  saved: boolean;
  disabled?: boolean;
  onPress: () => void;
  variant?: "card" | "overlay";
}) {
  const isOverlay = variant === "overlay";
  const iconColor = saved || isOverlay ? colors.white : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save deal"}
      hitSlop={8}
      disabled={disabled}
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      style={({ pressed }) => [
        styles.saveBtn,
        isOverlay ? styles.saveBtnOverlay : saved ? styles.saveBtnSaved : styles.saveBtnIdle,
        pressed && styles.saveBtnPressed,
        disabled && styles.saveBtnDisabled,
      ]}
    >
      <Heart
        size={16}
        color={iconColor}
        fill={saved ? iconColor : "transparent"}
        strokeWidth={2.2}
      />
    </Pressable>
  );
}

export function DealCard({
  deal,
  onPress,
  saved = false,
  saveDisabled = false,
  onToggleSave,
}: DealCardProps) {
  const isInStore = deal.type === "In-Store";
  const expired = isExpiredDeal(deal);
  const comingSoon = !expired && isComingSoonDeal(deal);
  const launchLabel = comingSoon
    ? formatLaunchRelative(deal.startTime) || "Coming soon"
    : null;
  const scheduleLabel =
    !comingSoon && !expired ? formatDealVisibleSchedule(deal) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deal.discount} at ${deal.brand}`}
      onPress={() => onPress?.(deal)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {deal.imageUrl ? (
          <Image
            source={{ uri: deal.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Tag color={colors.primary} size={28} />
          </View>
        )}

        {expired ? (
          <View style={[styles.badge, styles.badgeEnded]}>
            <Clock color={colors.onSurface} size={12} />
            <Text style={[styles.badgeText, styles.badgeTextEnded]}>Ended</Text>
          </View>
        ) : comingSoon ? (
          <View style={[styles.badge, styles.badgeComingSoon]}>
            <Clock color={colors.white} size={12} />
            <Text style={[styles.badgeText, styles.badgeTextComingSoon]}>
              Coming Soon
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.badge,
              isInStore ? styles.badgeInStore : styles.badgeOnline,
            ]}
          >
            {isInStore ? (
              <Store color={colors.onErrorContainer} size={12} />
            ) : (
              <Tag color={colors.onPrimaryContainer} size={12} />
            )}
            <Text
              style={[
                styles.badgeText,
                isInStore ? styles.badgeTextInStore : styles.badgeTextOnline,
              ]}
            >
              {deal.type}
            </Text>
          </View>
        )}

        {onToggleSave ? (
          <View style={styles.saveWrap}>
            <SaveDealButton
              saved={saved}
              disabled={saveDisabled}
              onPress={() => void onToggleSave(deal.id)}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.brand} numberOfLines={1}>
          {deal.brand}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {deal.title}
        </Text>
        <Text style={styles.discount}>{deal.discount}</Text>
        {launchLabel ? (
          <Text style={styles.launchLabel}>{launchLabel}</Text>
        ) : scheduleLabel ? (
          <Text style={styles.scheduleLabel}>{scheduleLabel}</Text>
        ) : null}
        {deal.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {deal.description}
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
  saveWrap: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 2,
  },
  saveBtn: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnIdle: {
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  saveBtnSaved: {
    backgroundColor: colors.primary,
  },
  saveBtnOverlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  saveBtnPressed: {
    opacity: 0.85,
  },
  saveBtnDisabled: {
    opacity: 0.5,
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
  badge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  badgeInStore: {
    backgroundColor: colors.errorContainer,
  },
  badgeOnline: {
    backgroundColor: colors.primaryContainer,
  },
  badgeComingSoon: {
    backgroundColor: colors.info,
  },
  badgeEnded: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextInStore: {
    color: colors.onErrorContainer,
  },
  badgeTextOnline: {
    color: colors.onPrimaryContainer,
  },
  badgeTextComingSoon: {
    color: colors.white,
  },
  badgeTextEnded: {
    color: colors.onSurface,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  brand: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onBackground,
  },
  discount: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.primary,
  },
  launchLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.info,
  },
  scheduleLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
});
