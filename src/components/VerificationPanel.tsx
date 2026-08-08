import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { MIN_TAP_TARGET, colors, radius, spacing } from "@/theme";
import type {
  InstitutionType,
  VerificationRpcResult,
} from "@/types/database";

const UNIVERSAL_SUFFIXES = [
  ".ac.lk",
  ".edu.lk",
  ".sliit.lk",
  ".edu",
  ".edu.au",
  ".ac.uk",
] as const;

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

interface VerificationPanelProps {
  hasPendingVerification: boolean;
  onPendingChange: (pending: boolean) => void;
}

export function VerificationPanel({
  hasPendingVerification,
  onPendingChange,
}: VerificationPanelProps) {
  const { user, refreshRole } = useAuth();

  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [uniEmail, setUniEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [uniError, setUniError] = useState<string | null>(null);
  const [uniSuccess, setUniSuccess] = useState(false);
  const [uniBusy, setUniBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [showManual, setShowManual] = useState(false);
  const [manualInstType, setManualInstType] =
    useState<InstitutionType>("university");
  const [manualInstName, setManualInstName] = useState("");
  const [manualCourse, setManualCourse] = useState("");
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualUri, setManualUri] = useState<string | null>(null);
  const [manualMime, setManualMime] = useState<string | null>(null);
  const [manualName, setManualName] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("allowed_domains").select("domain");
      if (data) {
        setAllowedDomains(
          data
            .map((row: { domain: string }) => row.domain.toLowerCase())
            .filter(Boolean),
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const isAllowedEmail = useCallback(
    (email: string): boolean => {
      const normalized = email.trim().toLowerCase();
      const domainPart = normalized.split("@")[1] ?? "";
      const universal = UNIVERSAL_SUFFIXES.some((suffix) =>
        normalized.endsWith(suffix),
      );
      return universal || allowedDomains.includes(domainPart);
    },
    [allowedDomains],
  );

  const requestOtp = useCallback(async () => {
    setUniError(null);
    setUniSuccess(false);

    const normalized = uniEmail.trim().toLowerCase();
    if (!normalized.includes("@")) {
      setUniError("Please enter a valid email address.");
      return;
    }
    if (!isAllowedEmail(normalized)) {
      setUniError(
        "Please use your official university or institutional student email address.",
      );
      return;
    }

    setUniBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-verification-otp",
        { body: { email: normalized } },
      );

      const payload = data as VerificationRpcResult | null;

      if (payload?.success) {
        setStep(2);
        setResendCooldown(60);
        return;
      }

      let reason = payload?.error;
      if (!reason && error && "context" in error) {
        const context = (
          error as { context?: { json?: () => Promise<{ error?: string }> } }
        ).context;
        reason = (await context?.json?.().catch(() => null))?.error;
      }
      setUniError(reason || "Failed to send the verification code.");
    } catch (caught) {
      setUniError(
        toErrorMessage(caught, "Couldn't send the verification code."),
      );
    } finally {
      setUniBusy(false);
    }
  }, [uniEmail, isAllowedEmail]);

  const confirmOtp = useCallback(async () => {
    setUniError(null);

    if (otpCode.length !== 6) {
      setUniError("Please enter a valid 6-digit code.");
      return;
    }

    setUniBusy(true);
    try {
      const { data, error } = await supabase.rpc(
        "confirm_university_verification",
        {
          entered_email: uniEmail.trim().toLowerCase(),
          entered_code: otpCode,
        },
      );

      if (error) throw error;

      const result = data as VerificationRpcResult;
      if (result?.success) {
        setUniSuccess(true);
        refreshRole();
      } else {
        setUniError(result?.error || "Verification failed.");
      }
    } catch (caught) {
      setUniError(toErrorMessage(caught, "An error occurred."));
    } finally {
      setUniBusy(false);
    }
  }, [otpCode, uniEmail, refreshRole]);

  const pickProof = useCallback(async () => {
    setManualError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_PROOF_BYTES) {
      setManualError("Proof image must be 5MB or smaller.");
      return;
    }

    setManualUri(asset.uri);
    setManualMime(asset.mimeType ?? "image/jpeg");
    setManualName(asset.fileName ?? `proof-${Date.now()}.jpg`);
  }, []);

  const submitManual = useCallback(async () => {
    setManualError(null);

    if (!user || !manualInstName.trim() || !manualUri || !manualMime) {
      setManualError("Institution name and proof document are required.");
      return;
    }

    if (
      manualInstType === "university" &&
      (!manualCourse.trim() || !manualStudentId.trim())
    ) {
      setManualError(
        "Course details and Student ID are required for University verification.",
      );
      return;
    }

    setManualBusy(true);
    try {
      const ext = (manualName?.split(".").pop() || "jpg").toLowerCase();
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const response = await fetch(manualUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, blob, { contentType: manualMime });

      if (uploadError) throw uploadError;

      const { data, error } = await supabase.rpc("submit_manual_verification", {
        inst_type: manualInstType,
        inst_name: manualInstName.trim(),
        course: manualCourse.trim(),
        student_id: manualStudentId.trim(),
        email: user.email || "unknown@example.com",
        image_url: filePath,
      });

      if (error) throw error;

      const result = data as VerificationRpcResult;
      if (result?.success) {
        setManualSuccess(true);
        setShowManual(false);
        onPendingChange(true);
      } else {
        setManualError(result?.error || "Failed to submit verification request.");
      }
    } catch (caught) {
      setManualError(
        toErrorMessage(caught, "An error occurred during submission."),
      );
    } finally {
      setManualBusy(false);
    }
  }, [
    user,
    manualInstName,
    manualUri,
    manualMime,
    manualName,
    manualInstType,
    manualCourse,
    manualStudentId,
    onPendingChange,
  ]);

  if (uniSuccess) {
    return (
      <View style={styles.card}>
        <Text style={styles.success}>University email verified.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Get verified</Text>
      <Text style={styles.body}>
        Confirm a university email, or upload your student ID for manual review.
      </Text>

      {hasPendingVerification || manualSuccess ? (
        <Text style={styles.pending}>
          Manual verification is pending review. You will be verified once an
          admin approves it.
        </Text>
      ) : null}

      {step === 1 ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="you@university.ac.lk"
            placeholderTextColor={colors.inverseOnSurface}
            autoCapitalize="none"
            keyboardType="email-address"
            value={uniEmail}
            onChangeText={setUniEmail}
          />
          {uniError ? <Text style={styles.error}>{uniError}</Text> : null}
          <Button
            label="Send verification code"
            loading={uniBusy}
            onPress={() => void requestOtp()}
          />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            Enter the 6-digit code sent to {uniEmail.trim().toLowerCase()}.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor={colors.inverseOnSurface}
            keyboardType="number-pad"
            maxLength={6}
            value={otpCode}
            onChangeText={setOtpCode}
          />
          {uniError ? <Text style={styles.error}>{uniError}</Text> : null}
          <Button
            label="Confirm code"
            loading={uniBusy}
            onPress={() => void confirmOtp()}
          />
          <Pressable
            disabled={resendCooldown > 0 || uniBusy}
            onPress={() => void requestOtp()}
            style={styles.linkBtn}
          >
            <Text style={styles.linkLabel}>
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend code"}
            </Text>
          </Pressable>
        </>
      )}

      <Pressable
        onPress={() => setShowManual((previous) => !previous)}
        style={styles.linkBtn}
      >
        <Text style={styles.linkLabel}>
          {showManual ? "Hide manual verification" : "Verify with student ID"}
        </Text>
      </Pressable>

      {showManual ? (
        <View style={styles.manualBlock}>
          <View style={styles.typeRow}>
            {(["university", "school"] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => setManualInstType(type)}
                style={[
                  styles.typeChip,
                  manualInstType === type && styles.typeChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeChipLabel,
                    manualInstType === type && styles.typeChipLabelActive,
                  ]}
                >
                  {type === "university" ? "University" : "School"}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Institution name"
            placeholderTextColor={colors.inverseOnSurface}
            value={manualInstName}
            onChangeText={setManualInstName}
          />

          {manualInstType === "university" ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Course / faculty"
                placeholderTextColor={colors.inverseOnSurface}
                value={manualCourse}
                onChangeText={setManualCourse}
              />
              <TextInput
                style={styles.input}
                placeholder="Student ID number"
                placeholderTextColor={colors.inverseOnSurface}
                value={manualStudentId}
                onChangeText={setManualStudentId}
              />
            </>
          ) : null}

          <Button
            label={manualUri ? "Change proof image" : "Upload proof image"}
            variant="ghost"
            onPress={() => void pickProof()}
          />
          {manualName ? (
            <Text style={styles.fileName} numberOfLines={1}>
              {manualName}
            </Text>
          ) : null}

          {manualError ? <Text style={styles.error}>{manualError}</Text> : null}

          <Button
            label="Submit for review"
            loading={manualBusy}
            onPress={() => void submitManual()}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onPrimaryContainer,
  },
  pending: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.warning,
  },
  success: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
  },
  input: {
    minHeight: MIN_TAP_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    fontSize: 15,
    color: colors.onSurface,
  },
  error: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  linkBtn: {
    minHeight: 36,
    justifyContent: "center",
  },
  linkLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onPrimaryFixed,
  },
  manualBlock: {
    gap: spacing.sm,
  },
  typeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    minHeight: MIN_TAP_TARGET - 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
  },
  typeChipLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  typeChipLabelActive: {
    color: colors.onPrimary,
  },
  fileName: {
    fontSize: 12,
    color: colors.onPrimaryContainer,
  },
});
