import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import {
  ImagePickerField,
  type PickedImage,
} from "@/components/ImagePickerField";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useAuth } from "@/context/AuthContext";
import { uploadAvatar } from "@/lib/avatarUpload";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { colors, spacing } from "@/theme";
import type { InstitutionType } from "@/types/database";

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role, metadata } = useAuth();
  const isStudent = role === "student";

  const [fullName, setFullName] = useState(
    metadata.full_name?.trim() || metadata.name?.trim() || "",
  );
  const [studentType, setStudentType] = useState<InstitutionType>(
    metadata.student_type === "school" ? "school" : "university",
  );
  const [institution, setInstitution] = useState(metadata.institution ?? "");
  const [department, setDepartment] = useState(metadata.department ?? "");
  const [batch, setBatch] = useState(metadata.batch ?? "");
  const [grade, setGrade] = useState(metadata.grade ?? "");
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    metadata.avatar_url ?? metadata.picture ?? null,
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = user?.email ?? "";

  const studentTypeOptions = useMemo(
    () =>
      [
        { value: "school" as const, label: "High School" },
        { value: "university" as const, label: "University / College" },
      ] as const,
    [],
  );

  const handleAvatarChange = useCallback(
    async (next: PickedImage | null) => {
      setPickedImage(next);
      if (!next || !user) return;

      setError(null);
      setIsUploadingAvatar(true);
      try {
        const { publicUrl } = await uploadAvatar({
          uri: next.uri,
          userId: user.id,
          mimeType: next.mimeType,
          fileSize: next.fileSize,
        });
        setAvatarPreview(publicUrl);
        setPickedImage(null);
      } catch (caught) {
        setPickedImage(null);
        setError(toErrorMessage(caught, "Couldn't upload that image."));
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [user],
  );

  const handleSave = useCallback(async () => {
    setError(null);
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }

    if (isStudent) {
      if (!institution.trim()) {
        setError(
          studentType === "school"
            ? "School name is required."
            : "University name is required.",
        );
        return;
      }
      if (studentType === "university") {
        if (!department.trim()) {
          setError("Faculty / department is required.");
          return;
        }
        if (!batch.trim()) {
          setError("Batch / intake is required.");
          return;
        }
      } else if (!grade.trim()) {
        setError("Current grade / year is required.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          ...(isStudent
            ? {
                student_type: studentType,
                institution: institution.trim(),
                department:
                  studentType === "university" ? department.trim() : "",
                batch: studentType === "university" ? batch.trim() : "",
                grade: studentType === "school" ? grade.trim() : "",
              }
            : {}),
        },
      });
      if (updateError) throw updateError;
      router.back();
    } catch (caught) {
      setError(toErrorMessage(caught, "Failed to save your profile."));
    } finally {
      setIsSaving(false);
    }
  }, [
    batch,
    department,
    fullName,
    grade,
    institution,
    isStudent,
    router,
    studentType,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          {isStudent
            ? "Update your photo and academic details. These appear on your student pass."
            : "Update the name and photo shown on your profile."}
        </Text>

        <ImagePickerField
          label="Profile photo"
          value={pickedImage}
          previewUrl={avatarPreview}
          onChange={(next) => void handleAvatarChange(next)}
          aspect={[1, 1]}
          frameHeight={140}
          shape="circle"
          allowClear={false}
          hint={
            isUploadingAvatar
              ? "Uploading…"
              : "JPG, PNG, or WEBP · max 5MB"
          }
        />

        <FormField
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          placeholder="Your name"
        />

        <FormField
          label="Email"
          value={email}
          editable={false}
          hint="Email can’t be changed here."
        />

        {isStudent ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Student Type</Text>
            <SegmentedControl
              options={studentTypeOptions}
              value={studentType}
              onChange={setStudentType}
            />
          </View>
        ) : null}

        {isStudent && studentType === "university" ? (
          <>
            <FormField
              label="University Name"
              value={institution}
              onChangeText={setInstitution}
              placeholder="e.g. University of Colombo"
            />
            <FormField
              label="Faculty / Department"
              value={department}
              onChangeText={setDepartment}
              placeholder="e.g. Computer Science"
            />
            <FormField
              label="Batch / Intake"
              value={batch}
              onChangeText={setBatch}
              placeholder="e.g. 2024"
            />
          </>
        ) : null}

        {isStudent && studentType === "school" ? (
          <>
            <FormField
              label="School Name"
              value={institution}
              onChangeText={setInstitution}
              placeholder="e.g. Royal College"
            />
            <FormField
              label="Current Grade / Year"
              value={grade}
              onChangeText={setGrade}
              placeholder="e.g. Grade 12"
            />
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={isSaving ? "Saving…" : "Save changes"}
          loading={isSaving || isUploadingAvatar}
          disabled={isUploadingAvatar}
          onPress={() => void handleSave()}
        />
        <Button
          label="Cancel"
          variant="ghost"
          disabled={isSaving || isUploadingAvatar}
          onPress={() => router.back()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  error: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
});
