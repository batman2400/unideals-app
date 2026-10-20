import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, MapPin } from "lucide-react-native";

import { formatPlace, openInMaps } from "@/lib/maps";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

interface LocationRowProps {
  label: string;
  name?: string | null;
  address?: string | null;
  /** Shown (non-tappable) when there is no name or address. */
  emptyText?: string;
}

/**
 * Detail-page location block. Tapping opens the place in the device's maps
 * app. Falls back to a plain row when no location was provided.
 */
export function LocationRow({
  label,
  name,
  address,
  emptyText = "Location TBA",
}: LocationRowProps) {
  const cleanName = name?.trim() || null;
  const cleanAddress = address?.trim() || null;
  const hasPlace = Boolean(cleanName || cleanAddress);

  const content = (
    <>
      <MapPin color={colors.primary} size={18} />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {hasPlace ? (cleanName ?? cleanAddress) : emptyText}
        </Text>
        {cleanName && cleanAddress ? (
          <Text style={styles.address}>{cleanAddress}</Text>
        ) : null}
        {hasPlace ? <Text style={styles.cta}>Open in Maps</Text> : null}
      </View>
      {hasPlace ? (
        <ChevronRight color={colors.onSurfaceVariant} size={18} />
      ) : null}
    </>
  );

  if (!hasPlace) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${formatPlace({ name: cleanName, address: cleanAddress })}. Open in Maps`}
      onPress={() => {
        void openInMaps({ name: cleanName, address: cleanAddress }).then(
          (opened) => {
            if (!opened) {
              Alert.alert(
                "Could not open Maps",
                "No maps app is available on this device.",
              );
            }
          },
        );
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: MIN_TAP_TARGET,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  pressed: {
    opacity: 0.85,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onBackground,
  },
  address: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  cta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
});
