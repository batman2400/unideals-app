import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useAuth } from "@/context/AuthContext";
import { isAllowedStudentEmail } from "@/lib/studentEmailDomain";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { isVerificationInFlight } from "@/lib/useVerificationRequest";
import { uploadVerificationImage } from "@/lib/verificationDocuments";
import { colors, radius, spacing } from "@/theme";
import type {
  InstitutionType,
  VerificationRpcResult,
} from "@/types/database";

type VerifyPath = "email_otp" | "manual";

interface ProofAsset {
  uri: string;
  mimeType: string | null;
  fileName: string | null;
}

interface VerificationPanelProps {
  isSchoolStudent: boolean;
  requestStatus: string | null;
  rejectReason: string | null;
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
  onRequestChange: () => void;
  /** Yearly re-verification after expiry or during the renewal window. */
  renewal?: boolean;
  expiresOn?: string | null;
}

export function VerificationPanel({
  isSchoolStudent,
  requestStatus,
  rejectReason,
  formOpen,
  onFormOpenChange,
  onRequestChange,
  renewal = false,
  expiresOn,
}: VerificationPanelProps) {
  const { user } = useAuth();
  const inFlight = isVerificationInFlight(requestStatus);
  const isRejected = requestStatus === "rejected";

  const [path, setPath] = useState<VerifyPath>(
    isSchoolStudent ? "manual" : "email_otp",
  );
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [domainsLoading, setDomainsLoading] = useState(false);

  const loadAllowedDomains = useCallback(async () => {
    setDomainsLoading(true);
    const { data, error } = await supabase.from("allowed_domains").select("domain");
    if (error) {
      setDomainsError(
        toErrorMessage(error, "Could not load the university email list."),
      );
      setDomainsLoading(false);
      return;
    }

    setDomainsError(null);
    setAllowedDomains(
      (data ?? [])
        .map((row: { domain: string }) => row.domain.toLowerCase())
        .filter(Boolean),
    );
    setDomainsLoading(false);
  }, []);

  useEffect(() => {
    void loadAllowedDomains();
  }, [loadAllowedDomains]);

  useEffect(() => {
    if (isSchoolStudent) setPath("manual");
  }, [isSchoolStudent]);

  if (inFlight) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>
          {renewal ? "Renewal pending" : "Verification pending"}
        </Text>
        <Text style={styles.pending}>
          {requestStatus === "awaiting_confirmation"
            ? "We confirmed your university inbox. An admin will check both sides of your student ID next."
            : "Both sides of your student ID are with an admin for review."}
        </Text>
      </View>
    );
  }

  if (!formOpen) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>
          {renewal ? "Re-verify for this year" : "Get verified"}
        </Text>
        {isRejected ? (
          <View style={styles.rejectBox}>
            <Text style={styles.rejectTitle}>
              Your last request was not approved
            </Text>
            <Text style={styles.rejectBody}>
              {rejectReason?.trim() || "Please submit a clearer request."}
            </Text>
          </View>
        ) : (
          <Text style={styles.body}>
            {renewal
              ? expiresOn
                ? `Student status is valid for 12 months. Re-verify by ${expiresOn} to keep deal codes and in-store tickets.`
                : "Student status expired. Re-verify to keep deal codes and in-store tickets."
              : "Verify your student status to unlock deal codes and in-store tickets. Status is valid for 12 months."}
          </Text>
        )}
        <Button
          label={
            isRejected
              ? "Resubmit verification"
              : renewal
                ? "Re-verify now"
                : "Get verified"
          }
          onPress={() => onFormOpenChange(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {renewal ? "Re-verify for this year" : "Get verified"}
      </Text>
      {isRejected ? (
        <View style={styles.rejectBox}>
          <Text style={styles.rejectTitle}>Your last request was not approved</Text>
          <Text style={styles.rejectBody}>
            {rejectReason?.trim() || "Please submit a clearer request."}
          </Text>
          <Text style={styles.body}>
            You can submit again with a clear photo of the front and back of your
            student ID.
          </Text>
        </View>
      ) : (
        <Text style={styles.body}>
          {isSchoolStudent
            ? "School students send both sides of a student ID for admin review. Verification is valid for 12 months."
            : "Use a university email so we can confirm your inbox, then an admin checks your ID. Without an institute email, use manual verification. Status is valid for 12 months."}
        </Text>
      )}

      {isSchoolStudent ? null : (
        <SegmentedControl
          options={[
            { value: "email_otp", label: "University email" },
            { value: "manual", label: "Manual / school" },
          ]}
          value={path}
          onChange={setPath}
        />
      )}

      {path === "email_otp" && !isSchoolStudent ? (
        <>
          {domainsError ? (
            <View style={styles.rejectBox}>
              <Text style={styles.rejectTitle}>
                Could not load the university email list
              </Text>
              <Text style={styles.rejectBody}>{domainsError}</Text>
              <Button
                label={domainsLoading ? "Retrying…" : "Retry"}
                loading={domainsLoading}
                variant="ghost"
                onPress={() => void loadAllowedDomains()}
              />
            </View>
          ) : null}
          <EmailOtpForm
            userId={user?.id}
            allowedDomains={allowedDomains}
            onSubmitted={onRequestChange}
          />
        </>
      ) : (
        <ManualForm
          userId={user?.id}
          accountEmail={user?.email ?? ""}
          defaultType={isSchoolStudent ? "school" : "university"}
          onSubmitted={onRequestChange}
        />
      )}

      <Pressable onPress={() => onFormOpenChange(false)} style={styles.linkBtn}>
        <Text style={styles.linkLabel}>Not now</Text>
      </Pressable>
    </View>
  );
}

function EmailOtpForm({
  userId,
  allowedDomains,
  onSubmitted,
}: {
  userId: string | undefined;
  allowedDomains: readonly string[];
  onSubmitted: () => void;
}) {
  const [uniEmail, setUniEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [course, setCourse] = useState("");
  const [studentId, setStudentId] = useState("");
  const [front, setFront] = useState<ProofAsset | null>(null);
  const [back, setBack] = useState<ProofAsset | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const validateForm = useCallback((): string | null => {
    const normalized = uniEmail.trim().toLowerCase();
    if (!normalized.includes("@")) return "Please enter a valid email address.";
    if (!isAllowedStudentEmail(normalized, allowedDomains)) {
      return "Please use your official university or institutional student email.";
    }
    if (!institution.trim() || !course.trim() || !studentId.trim()) {
      return "Institution, course, and student ID are required.";
    }
    if (!front || !back) {
      return "Upload the front and back of your student ID.";
    }
    return null;
  }, [allowedDomains, back, course, front, institution, studentId, uniEmail]);

  const requestOtp = useCallback(async () => {
    setError(null);
    const formError = validateForm();
    if (formError) {
      setError(formError);
      return;
    }

    setBusy(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "send-verification-otp",
        { body: { email: uniEmail.trim().toLowerCase() } },
      );
      const payload = data as VerificationRpcResult | null;
      if (payload?.success) {
        setStep(2);
        setResendCooldown(60);
        return;
      }
      let reason = payload?.error;
      if (!reason && invokeError && "context" in invokeError) {
        const context = (
          invokeError as {
            context?: { json?: () => Promise<{ error?: string }> };
          }
        ).context;
        reason = (await context?.json?.().catch(() => null))?.error;
      }
      setError(reason || "Failed to send the verification code.");
    } catch (caught) {
      setError(toErrorMessage(caught, "Couldn't send the verification code."));
    } finally {
      setBusy(false);
    }
  }, [uniEmail, validateForm]);

  const confirmOtp = useCallback(async () => {
    setError(null);
    if (!userId || !front || !back) {
      setError("Upload the front and back of your student ID.");
      return;
    }
    if (otpCode.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setBusy(true);
    try {
      const [frontPath, backPath] = await Promise.all([
        uploadVerificationImage({
          userId,
          uri: front.uri,
          mimeType: front.mimeType,
          fileName: front.fileName,
          side: "front",
        }),
        uploadVerificationImage({
          userId,
          uri: back.uri,
          mimeType: back.mimeType,
          fileName: back.fileName,
          side: "back",
        }),
      ]);

      const { data, error: rpcError } = await supabase.rpc(
        "confirm_university_verification",
        {
          entered_email: uniEmail.trim().toLowerCase(),
          entered_code: otpCode,
          inst_name: institution.trim(),
          course: course.trim(),
          student_id: studentId.trim(),
          image_url: frontPath,
          image_back_url: backPath,
        },
      );
      if (rpcError) throw rpcError;
      const result = data as VerificationRpcResult;
      if (result?.success) {
        onSubmitted();
      } else {
        setError(result?.error || "Verification failed.");
      }
    } catch (caught) {
      setError(toErrorMessage(caught, "An error occurred."));
    } finally {
      setBusy(false);
    }
  }, [
    back,
    course,
    front,
    institution,
    onSubmitted,
    otpCode,
    studentId,
    uniEmail,
    userId,
  ]);

  return (
    <View style={styles.form}>
      <Text style={styles.hint}>
        We confirm the inbox first, then an admin checks both sides of your
        student ID. You are not verified until an admin approves. Status lasts
        12 months.
      </Text>
      <FormField
        label="University email"
        placeholder="you@university.ac.lk"
        autoCapitalize="none"
        keyboardType="email-address"
        value={uniEmail}
        onChangeText={setUniEmail}
      />
      <FormField
        label="Institution"
        placeholder="University or campus name"
        value={institution}
        onChangeText={setInstitution}
      />
      <FormField
        label="Course / faculty"
        placeholder="e.g. BSc Computer Science"
        value={course}
        onChangeText={setCourse}
      />
      <FormField
        label="Student ID number"
        placeholder="As printed on your ID"
        autoCapitalize="characters"
        value={studentId}
        onChangeText={setStudentId}
      />
      <IdPhotoPicker label="Student ID — front" value={front} onChange={setFront} />
      <IdPhotoPicker label="Student ID — back" value={back} onChange={setBack} />

      {step === 1 ? (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Send verification code"
            loading={busy}
            onPress={() => void requestOtp()}
          />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            Enter the 6-digit code sent to {uniEmail.trim().toLowerCase()}.
          </Text>
          <FormField
            label="Verification code"
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            value={otpCode}
            onChangeText={setOtpCode}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Confirm code"
            loading={busy}
            onPress={() => void confirmOtp()}
          />
          <Pressable
            disabled={resendCooldown > 0 || busy}
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
    </View>
  );
}

function ManualForm({
  userId,
  accountEmail,
  defaultType,
  onSubmitted,
}: {
  userId: string | undefined;
  accountEmail: string;
  defaultType: InstitutionType;
  onSubmitted: () => void;
}) {
  const [instType, setInstType] = useState<InstitutionType>(defaultType);
  const [instName, setInstName] = useState("");
  const [course, setCourse] = useState("");
  const [studentId, setStudentId] = useState("");
  const [front, setFront] = useState<ProofAsset | null>(null);
  const [back, setBack] = useState<ProofAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    setError(null);
    if (!userId || !instName.trim() || !front || !back) {
      setError("Institution name and both sides of your student ID are required.");
      return;
    }
    if (instType === "university" && (!course.trim() || !studentId.trim())) {
      setError("Course details and student ID are required for university verification.");
      return;
    }

    setBusy(true);
    try {
      const [frontPath, backPath] = await Promise.all([
        uploadVerificationImage({
          userId,
          uri: front.uri,
          mimeType: front.mimeType,
          fileName: front.fileName,
          side: "front",
        }),
        uploadVerificationImage({
          userId,
          uri: back.uri,
          mimeType: back.mimeType,
          fileName: back.fileName,
          side: "back",
        }),
      ]);

      const { data, error: rpcError } = await supabase.rpc(
        "submit_manual_verification",
        {
          inst_type: instType,
          inst_name: instName.trim(),
          course: instType === "school" ? course.trim() : course.trim(),
          student_id: studentId.trim(),
          email: accountEmail || "unknown@example.com",
          image_url: frontPath,
          image_back_url: backPath,
        },
      );
      if (rpcError) throw rpcError;
      const result = data as VerificationRpcResult;
      if (result?.success) {
        onSubmitted();
      } else {
        setError(result?.error || "Failed to submit verification request.");
      }
    } catch (caught) {
      setError(toErrorMessage(caught, "An error occurred during submission."));
    } finally {
      setBusy(false);
    }
  }, [
    accountEmail,
    back,
    course,
    front,
    instName,
    instType,
    onSubmitted,
    studentId,
    userId,
  ]);

  return (
    <View style={styles.form}>
      <Text style={styles.hint}>
        Upload both sides of your student ID for admin review. You are not
        verified until an admin approves. Status lasts 12 months.
      </Text>
      <SegmentedControl
        options={[
          { value: "university", label: "University" },
          { value: "school", label: "School" },
        ]}
        value={instType}
        onChange={setInstType}
      />
      <FormField
        label="Institution name"
        placeholder={
          instType === "school" ? "School name" : "University or campus name"
        }
        value={instName}
        onChangeText={setInstName}
      />
      {instType === "university" ? (
        <>
          <FormField
            label="Course / faculty"
            placeholder="e.g. BSc Computer Science"
            value={course}
            onChangeText={setCourse}
          />
          <FormField
            label="Student ID number"
            placeholder="As printed on your ID"
            autoCapitalize="characters"
            value={studentId}
            onChangeText={setStudentId}
          />
        </>
      ) : (
        <>
          <FormField
            label="Grade / year"
            placeholder="e.g. Grade 12 / A/L"
            value={course}
            onChangeText={setCourse}
          />
          <FormField
            label="Student ID number"
            placeholder="If you have one"
            autoCapitalize="characters"
            value={studentId}
            onChangeText={setStudentId}
          />
        </>
      )}
      <FormField
        label="Contact email"
        value={accountEmail}
        editable={false}
      />
      <IdPhotoPicker label="Student ID — front" value={front} onChange={setFront} />
      <IdPhotoPicker label="Student ID — back" value={back} onChange={setBack} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label="Submit for review"
        loading={busy}
        onPress={() => void submit()}
      />
    </View>
  );
}

function IdPhotoPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ProofAsset | null;
  onChange: (next: ProofAsset) => void;
}) {
  const pick = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert("Image too large", "Please choose an image under 5MB.");
      return;
    }
    onChange({
      uri: asset.uri,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileName: asset.fileName ?? null,
    });
  }, [onChange]);

  return (
    <View style={styles.photoBlock}>
      <Button
        label={value ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        variant="ghost"
        onPress={() => void pick()}
      />
      {value ? (
        <Text style={styles.fileName} numberOfLines={1}>
          {value.fileName || "Photo selected"}
        </Text>
      ) : (
        <Text style={styles.photoHint}>{label} · JPEG, PNG, or WEBP · max 5MB</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onBackground,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurfaceVariant,
  },
  pending: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.warning,
  },
  form: {
    gap: spacing.sm,
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
    color: colors.primary,
  },
  rejectBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.errorContainer,
  },
  rejectTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onErrorContainer,
  },
  rejectBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onErrorContainer,
  },
  photoBlock: {
    gap: spacing.xs,
  },
  fileName: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  photoHint: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
});
