import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/AuthContext";
import { isAllowedStudentEmail } from "@/lib/studentEmailDomain";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { isVerificationInFlight } from "@/lib/useVerificationRequest";
import {
  OTHER_UNIVERSITY,
  emailMatchesUniversity,
  findUniversityByEmail,
  mergeUniversityOptions,
  type UniversityDomainRow,
  type UniversityOption,
} from "@/lib/universities";
import {
  ID_UPLOAD_MAX_BYTES,
  assertIdImageType,
  uploadVerificationImage,
} from "@/lib/verificationDocuments";
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
  const [dbUniversities, setDbUniversities] = useState<UniversityDomainRow[]>(
    [],
  );
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [domainsLoading, setDomainsLoading] = useState(false);

  const universities = useMemo(
    () => mergeUniversityOptions(dbUniversities),
    [dbUniversities],
  );

  const loadAllowedDomains = useCallback(async () => {
    setDomainsLoading(true);
    const { data, error } = await supabase
      .from("allowed_domains")
      .select("domain, institution_name");
    if (error) {
      setDomainsError(
        toErrorMessage(error, "Could not load the university email list."),
      );
      setDomainsLoading(false);
      return;
    }

    const rows = (data ?? []) as UniversityDomainRow[];
    setDomainsError(null);
    setDbUniversities(rows);
    setAllowedDomains(
      rows
        .map((row) => String(row.domain ?? "").trim().toLowerCase())
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

  const otpSection = !isSchoolStudent ? (
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
        allowedDomains={allowedDomains}
        universities={universities}
        intro={
          inFlight
            ? "Have a university email? Choose your university and enter the code we send to verify immediately without waiting for ID review."
            : "Choose your university, then enter the 6-digit code we send. A correct code verifies you straight away. Status lasts 12 months."
        }
        onSubmitted={onRequestChange}
      />
    </>
  ) : null;

  if (inFlight) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>
          {renewal ? "Renewal pending" : "Verification pending"}
        </Text>
        <Text style={styles.pending}>
          Both sides of your student ID are with an admin for review.
        </Text>
        {otpSection}
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
            Use your university email if you have one, or submit again with a
            clear photo of the front and back of your student ID.
          </Text>
        </View>
      ) : (
        <Text style={styles.body}>
          {isSchoolStudent
            ? "School students send both sides of a student ID for admin review. Verification is valid for 12 months."
            : "A correct code sent to your university email verifies you immediately. Upload a student ID only if you do not have an institute email."}
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
        otpSection
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
  allowedDomains,
  universities,
  intro,
  onSubmitted,
}: {
  allowedDomains: readonly string[];
  universities: readonly UniversityOption[];
  intro: string;
  onSubmitted: () => void;
}) {
  const [uniEmail, setUniEmail] = useState("");
  const [selectedUni, setSelectedUni] = useState("");
  const [otherUniName, setOtherUniName] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const uniOptions = useMemo(
    () => [
      { value: "", label: "Select your university" },
      { value: OTHER_UNIVERSITY, label: "Other / not listed" },
      ...universities.map((uni) => ({ value: uni.name, label: uni.name })),
    ],
    [universities],
  );

  const chosenUniversityName = useCallback(() => {
    if (selectedUni === OTHER_UNIVERSITY) return otherUniName.trim();
    return selectedUni.trim();
  }, [otherUniName, selectedUni]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const applyEmailUniversityMatch = useCallback(
    (email: string) => {
      const match = findUniversityByEmail(email, universities);
      if (match) {
        setSelectedUni(match.name);
        setOtherUniName("");
      }
    },
    [universities],
  );

  const validateForm = useCallback((): string | null => {
    const institution = chosenUniversityName();
    if (!institution) return "Please choose your university.";
    const normalized = uniEmail.trim().toLowerCase();
    if (!normalized.includes("@")) return "Please enter a valid email address.";
    if (!isAllowedStudentEmail(normalized, allowedDomains)) {
      return "Please use your official university or institutional student email.";
    }
    const selected: UniversityOption | undefined =
      selectedUni === OTHER_UNIVERSITY
        ? { name: institution, domains: [] }
        : universities.find((uni) => uni.name === selectedUni);
    if (selected && !emailMatchesUniversity(normalized, selected)) {
      const hint = selected.domains[0]
        ? ` Use your @${selected.domains[0]} address.`
        : "";
      return `That email does not match ${selected.name}.${hint}`;
    }
    return null;
  }, [
    allowedDomains,
    chosenUniversityName,
    selectedUni,
    uniEmail,
    universities,
  ]);

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
    const institution = chosenUniversityName();
    if (!institution) {
      setError("Please choose your university.");
      return;
    }
    if (otpCode.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setBusy(true);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "confirm_university_verification",
        {
          entered_email: uniEmail.trim().toLowerCase(),
          entered_code: otpCode,
          inst_name: institution,
          course: null,
          student_id: null,
          image_url: null,
          image_back_url: null,
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
  }, [chosenUniversityName, onSubmitted, otpCode, uniEmail]);

  return (
    <View style={styles.form}>
      <Text style={styles.hint}>{intro}</Text>
      <Select
        label="University"
        value={selectedUni}
        options={uniOptions}
        onChange={setSelectedUni}
      />
      {selectedUni === OTHER_UNIVERSITY ? (
        <FormField
          label="University or institute name"
          placeholder="University or institute name"
          value={otherUniName}
          onChangeText={setOtherUniName}
        />
      ) : null}
      <FormField
        label="University email"
        placeholder="you@university.ac.lk"
        autoCapitalize="none"
        keyboardType="email-address"
        value={uniEmail}
        onChangeText={(next) => {
          setUniEmail(next);
          applyEmailUniversityMatch(next);
        }}
      />

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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access so you can upload student ID proof.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize != null && asset.fileSize > ID_UPLOAD_MAX_BYTES) {
      Alert.alert("Image too large", "Please choose an image under 5MB.");
      return;
    }
    let mimeType: string;
    try {
      mimeType = assertIdImageType(asset.mimeType, asset.fileName);
    } catch (error) {
      Alert.alert(
        "Unsupported image",
        error instanceof Error
          ? error.message
          : "Please upload a JPEG, PNG, or WEBP image.",
      );
      return;
    }
    onChange({
      uri: asset.uri,
      mimeType,
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
