import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Calendar, Clock } from "lucide-react-native";

import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";

interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
  hint?: string;
  optional?: boolean;
}

type PickerStep = "date" | "time" | null;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function withTime(datePart: Date, timePart: Date): Date {
  const next = new Date(datePart);
  next.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return next;
}

function formatDate(value: Date | null): string {
  if (!value) return "Pick date";
  return value.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: Date | null): string {
  if (!value) return "Pick time";
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/**
 * Native Android/iOS date and time dialogs as two separate selectors.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  hint,
  optional = false,
}: DateTimeFieldProps) {
  const [step, setStep] = useState<PickerStep>(null);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(() => value ?? new Date());

  const seed = value ?? new Date();

  const openStep = (next: Exclude<PickerStep, null>) => {
    if (Platform.OS === "ios") {
      setIosDraft(seed);
      setIosOpen(true);
      return;
    }
    setStep(next);
  };

  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type !== "set" || !selected) {
      setStep(null);
      return;
    }

    if (step === "date") {
      const next = value
        ? withTime(selected, value)
        : withTime(selected, new Date(seed.getFullYear(), seed.getMonth(), seed.getDate(), 9, 0, 0, 0));
      onChange(next);
      setStep(null);
      return;
    }

    if (step === "time") {
      const dateBase = value ?? seed;
      onChange(withTime(dateBase, selected));
      setStep(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} date`}
          onPress={() => openStep("date")}
          style={({ pressed }) => [
            styles.trigger,
            styles.half,
            pressed && styles.pressed,
          ]}
        >
          <Calendar size={18} color={colors.primary} />
          <Text
            style={[styles.value, !value && styles.placeholder]}
            numberOfLines={1}
          >
            {formatDate(value)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} time`}
          onPress={() => openStep("time")}
          style={({ pressed }) => [
            styles.trigger,
            styles.half,
            pressed && styles.pressed,
          ]}
        >
          <Clock size={18} color={colors.primary} />
          <Text
            style={[styles.value, !value && styles.placeholder]}
            numberOfLines={1}
          >
            {formatTime(value)}
          </Text>
        </Pressable>
      </View>
      {optional && value ? (
        <Pressable onPress={() => onChange(null)} style={styles.clear}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {Platform.OS === "android" && step ? (
        <DateTimePicker
          value={seed}
          mode={step}
          display="default"
          onChange={onAndroidChange}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          visible={iosOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIosOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <DateTimePicker
                value={iosDraft}
                mode="datetime"
                display="spinner"
                themeVariant="light"
                accentColor={colors.primary}
                onChange={(_event, next) => {
                  if (next) setIosDraft(next);
                }}
              />
              <View style={styles.actions}>
                <Pressable
                  onPress={() => setIosOpen(false)}
                  style={styles.actionBtn}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(iosDraft);
                    setIosOpen(false);
                  }}
                  style={[styles.actionBtn, styles.saveBtn]}
                >
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
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
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  trigger: {
    minHeight: MIN_TAP_TARGET + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.9,
  },
  value: {
    flex: 1,
    fontSize: 14,
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
