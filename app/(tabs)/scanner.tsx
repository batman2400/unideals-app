import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import {
  CheckCircle2,
  Keyboard as KeyboardIcon,
  QrCode,
  ShieldAlert,
  XCircle,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import type { ScanResult, ValidateTicketRow } from "@/types/database";

/** Cooldown between accepted camera reads so one QR does not fire repeatedly. */
const SCAN_COOLDOWN_MS = 2500;

const SUCCESS_RESULTS: readonly ScanResult[] = ["valid"];

interface ScanLogEntry {
  key: string;
  title: string;
  time: string;
}

export default function ScannerScreen() {
  const { role } = useAuth();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [outcome, setOutcome] = useState<ValidateTicketRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanLogEntry[]>([]);

  const lastScanAtRef = useRef(0);

  const validate = useCallback(
    async (payload: string, method: "camera" | "manual") => {
      const trimmed = payload.trim();
      if (!trimmed || isVerifying) return;

      setIsVerifying(true);
      setError(null);
      setOutcome(null);

      const { data, error: rpcError } = await supabase.rpc(
        "validate_instore_ticket",
        { scanned_payload: trimmed, scan_method: method },
      );

      if (rpcError) {
        setError(toErrorMessage(rpcError, "Verification failed. Try again."));
        setIsVerifying(false);
        return;
      }

      const row = (data as ValidateTicketRow[] | null)?.[0] ?? null;

      if (!row) {
        setError("Unexpected response from the server.");
        setIsVerifying(false);
        return;
      }

      setOutcome(row);

      if (SUCCESS_RESULTS.includes(row.result) && row.deal_title) {
        setHistory((previous) =>
          [
            {
              key: `${row.ticket_id ?? row.event_id ?? Date.now()}-${Date.now()}`,
              title: row.deal_title as string,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
            ...previous,
          ].slice(0, 5),
        );
      }

      setIsVerifying(false);
    },
    [isVerifying],
  );

  const handleBarcodeScanned = useCallback(
    (scan: BarcodeScanningResult) => {
      const now = Date.now();
      if (now - lastScanAtRef.current < SCAN_COOLDOWN_MS) return;
      lastScanAtRef.current = now;

      void validate(scan.data, "camera");
    },
    [validate],
  );

  const openCamera = useCallback(async () => {
    setError(null);
    setOutcome(null);

    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        setError(
          "Camera access is required to scan tickets. Enable it in system settings.",
        );
        return;
      }
    }

    setIsCameraOpen(true);
  }, [permission, requestPermission]);

  if (role !== "partner") {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <ShieldAlert color={colors.onSurfaceVariant} size={32} />
        <Text style={styles.gateTitle}>Partners only</Text>
        <Text style={styles.gateBody}>
          Ticket scanning is available to brand partners validating in-store
          redemptions at the register.
          {role === "admin"
            ? " Admin scanning requires brand impersonation, which is web-only for now."
            : ""}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Scan a ticket</Text>
        <Text style={styles.subtitle}>
          Point the camera at the student&apos;s QR code, or type the UD- code
          shown on their screen.
        </Text>
      </View>

      <View style={styles.cameraFrame}>
        {isCameraOpen ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={isVerifying ? undefined : handleBarcodeScanned}
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <QrCode color={colors.primary} size={40} />
            <Text style={styles.cameraPlaceholderText}>Camera is off</Text>
          </View>
        )}
        <View pointerEvents="none" style={styles.reticle} />
      </View>

      <Button
        label={isCameraOpen ? "Stop camera" : "Start camera"}
        variant={isCameraOpen ? "ghost" : "primary"}
        onPress={() => {
          if (isCameraOpen) {
            setIsCameraOpen(false);
          } else {
            void openCamera();
          }
        }}
      />

      <View style={styles.manualBlock}>
        <View style={styles.manualLabelRow}>
          <KeyboardIcon color={colors.onSurfaceVariant} size={16} />
          <Text style={styles.manualLabel}>Enter code manually</Text>
        </View>

        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="UD-A7X9K2"
            placeholderTextColor={colors.inverseOnSurface}
            value={manualCode}
            onChangeText={(text) => setManualCode(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void validate(manualCode, "manual")}
          />
          <Button
            label="Verify"
            variant="secondary"
            disabled={manualCode.trim().length === 0}
            loading={isVerifying}
            onPress={() => void validate(manualCode, "manual")}
            style={styles.verifyButton}
          />
        </View>
      </View>

      {isVerifying ? (
        <View style={styles.verifying}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.verifyingText}>Checking ticket…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.outcome, styles.outcomeFail]}>
          <XCircle color={colors.onErrorContainer} size={20} />
          <Text style={styles.outcomeFailText}>{error}</Text>
        </View>
      ) : null}

      {outcome ? <OutcomeCard outcome={outcome} /> : null}

      {history.length > 0 ? (
        <View style={styles.historyBlock}>
          <Text style={styles.historyHeading}>Recent redemptions</Text>
          {history.map((entry) => (
            <View key={entry.key} style={styles.historyRow}>
              <CheckCircle2 color={colors.primary} size={16} />
              <Text style={styles.historyTitle} numberOfLines={1}>
                {entry.title}
              </Text>
              <Text style={styles.historyTime}>{entry.time}</Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => setHistory([])}
            style={styles.clearHistory}
          >
            <Text style={styles.clearHistoryLabel}>Clear</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function OutcomeCard({ outcome }: { outcome: ValidateTicketRow }) {
  const isValid = outcome.result === "valid";

  return (
    <View style={[styles.outcome, isValid ? styles.outcomePass : styles.outcomeFail]}>
      {isValid ? (
        <CheckCircle2 color={colors.onPrimaryContainer} size={20} />
      ) : (
        <XCircle color={colors.onErrorContainer} size={20} />
      )}
      <View style={styles.outcomeBody}>
        <Text
          style={isValid ? styles.outcomePassTitle : styles.outcomeFailTitle}
        >
          {isValid ? "Redemption approved" : formatResult(outcome.result)}
        </Text>
        <Text
          style={isValid ? styles.outcomePassText : styles.outcomeFailText}
        >
          {outcome.message}
        </Text>
        {isValid && outcome.deal_title ? (
          <Text style={styles.outcomeDeal}>
            {outcome.deal_title}
            {outcome.deal_discount ? ` · ${outcome.deal_discount}` : ""}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function formatResult(result: ScanResult): string {
  switch (result) {
    case "already_redeemed":
      return "Already redeemed";
    case "expired":
      return "Ticket expired";
    case "not_found":
      return "Ticket not found";
    case "wrong_brand":
      return "Different brand";
    case "not_approved":
      return "Deal not approved";
    case "invalid":
      return "Invalid code";
    default:
      return "Rejected";
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  gateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onBackground,
  },
  gateBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.onBackground,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  cameraFrame: {
    height: 280,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.inverseSurface,
    justifyContent: "center",
  },
  camera: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cameraPlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
  },
  cameraPlaceholderText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  reticle: {
    alignSelf: "center",
    width: 180,
    height: 180,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.primaryContainer,
  },
  manualBlock: {
    gap: spacing.sm,
  },
  manualLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  manualLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  manualRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
    minHeight: MIN_TAP_TARGET + 6,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.onSurface,
  },
  verifyButton: {
    paddingHorizontal: spacing.lg,
  },
  verifying: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  verifyingText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  outcome: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  outcomeBody: {
    flex: 1,
    gap: 2,
  },
  outcomePass: {
    backgroundColor: colors.primaryContainer,
  },
  outcomeFail: {
    backgroundColor: colors.errorContainer,
  },
  outcomePassTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  outcomeFailTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onErrorContainer,
  },
  outcomePassText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onPrimaryContainer,
  },
  outcomeFailText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.onErrorContainer,
  },
  outcomeDeal: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: "700",
    color: colors.onPrimaryFixed,
  },
  historyBlock: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  historyHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  historyTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.onBackground,
  },
  historyTime: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  clearHistory: {
    alignSelf: "flex-start",
    minHeight: 32,
    justifyContent: "center",
  },
  clearHistoryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});
