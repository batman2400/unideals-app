import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

interface FormFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
}

export function FormField({
  label,
  hint,
  error,
  style,
  ...inputProps
}: FormFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inverseOnSurface}
        style={[styles.input, inputProps.multiline && styles.multiline, style]}
        {...inputProps}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
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
  input: {
    minHeight: MIN_TAP_TARGET + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    fontSize: 15,
    color: colors.onSurface,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  hint: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },
  error: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
  },
});
