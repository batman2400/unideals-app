import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
  hint?: string;
  optional?: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDatePart(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function toTimePart(value: Date): string {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function parseParts(datePart: string, timePart: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timePart.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const next = new Date(year, month, day, hour, minute, 0, 0);
  if (Number.isNaN(next.getTime())) return null;
  return next;
}

function formatValue(value: Date | null): string {
  if (!value) return "Tap to choose";
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * JS-only date/time field.
 *
 * Avoids `@react-native-community/datetimepicker` so the current development
 * client can run without a native rebuild. Swap back after the next
 * `expo run:android` / EAS build if you want the system picker.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  hint,
  optional = false,
}: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => value ?? new Date(), [value]);
  const [datePart, setDatePart] = useState(toDatePart(initial));
  const [timePart, setTimePart] = useState(toTimePart(initial));
  const [error, setError] = useState<string | null>(null);

  const openEditor = () => {
    const seed = value ?? new Date();
    setDatePart(toDatePart(seed));
    setTimePart(toTimePart(seed));
    setError(null);
    setOpen(true);
  };

  const save = () => {
    const parsed = parseParts(datePart, timePart);
    if (!parsed) {
      setError("Use date as YYYY-MM-DD and time as HH:MM.");
      return;
    }
    onChange(parsed);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={openEditor}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {formatValue(value)}
        </Text>
      </Pressable>
      {optional && value ? (
        <Pressable onPress={() => onChange(null)} style={styles.clear}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={datePart}
              onChangeText={setDatePart}
              placeholder="2026-08-15"
              placeholderTextColor={colors.inverseOnSurface}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldLabel}>Time (HH:MM, 24h)</Text>
            <TextInput
              style={styles.input}
              value={timePart}
              onChangeText={setTimePart}
              placeholder="14:30"
              placeholderTextColor={colors.inverseOnSurface}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable onPress={() => setOpen(false)} style={styles.actionBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={save}
                style={[styles.actionBtn, styles.saveBtn]}
              >
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  trigger: {
    minHeight: MIN_TAP_TARGET + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.9,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurface,
  },
  placeholder: {
    color: colors.inverseOnSurface,
    fontWeight: "500",
  },
  clear: {
    alignSelf: "flex-start",
  },
  clearText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  hint: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onBackground,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  input: {
    minHeight: MIN_TAP_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.background,
    fontSize: 15,
    color: colors.onSurface,
  },
  error: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    minHeight: MIN_TAP_TARGET,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onPrimary,
  },
});
