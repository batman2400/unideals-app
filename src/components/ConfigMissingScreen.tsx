import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

/**
 * Shown when EXPO_PUBLIC_SUPABASE_* credentials are missing so the app does
 * not silently fire RPCs against an empty client.
 */
export function ConfigMissingScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Supabase is not configured</Text>
      <Text style={styles.body}>
        Copy `unideals-app/.env.example` to `.env` and set
        `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the
        same values as the web app&apos;s `VITE_SUPABASE_*` keys, then restart
        Expo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onBackground,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
});
