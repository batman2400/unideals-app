import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { DateTimeField } from "@/components/DateTimeField";
import { FormField } from "@/components/FormField";
import {
  ImagePickerField,
  type PickedImage,
} from "@/components/ImagePickerField";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/AuthContext";
import { validateSchedule } from "@/lib/dealForm";
import { uploadEventImage } from "@/lib/eventImageUpload";
import { asHttpUrl } from "@/lib/httpUrl";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { colors, spacing } from "@/theme";
import {
  EVENT_AUDIENCE_OPTIONS,
  EVENT_CATEGORY_OPTIONS,
  type EventAudience,
  type EventCategory,
} from "@/types/database";

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>("social");
  const [universityName, setUniversityName] = useState("");
  const [clubName, setClubName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [targetAudience, setTargetAudience] =
    useState<EventAudience>("all_students");
  const [externalRegistrationUrl, setExternalRegistrationUrl] = useState("");
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [publishAt, setPublishAt] = useState<Date | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const isDirty = useMemo(
    () =>
      Boolean(
        title.trim() ||
          description.trim() ||
          universityName.trim() ||
          clubName.trim() ||
          locationName.trim() ||
          externalRegistrationUrl.trim() ||
          startAt ||
          endAt ||
          publishAt ||
          image ||
          category !== "social" ||
          targetAudience !== "all_students",
      ),
    [
      title,
      description,
      universityName,
      clubName,
      locationName,
      externalRegistrationUrl,
      startAt,
      endAt,
      publishAt,
      image,
      category,
      targetAudience,
    ],
  );
  const allowLeave = useUnsavedChangesGuard(isDirty);

  const handleSubmit = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!user) {
      setError("You must be signed in to submit an event.");
      return;
    }
    if (!title.trim()) {
      setError("Event title is required.");
      return;
    }

    const scheduleError = validateSchedule(startAt, endAt, {
      startRequired: true,
    });
    if (scheduleError) {
      setError(scheduleError);
      return;
    }
    if (!startAt) {
      setError("Start date and time are required.");
      return;
    }

    let registrationUrl: string | null = null;
    if (externalRegistrationUrl.trim()) {
      registrationUrl = asHttpUrl(externalRegistrationUrl);
      if (!registrationUrl) {
        setError("Enter a valid http(s) registration link.");
        return;
      }
    }

    inFlightRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      const organizerId = authUser?.id ?? user.id;
      if (!organizerId) {
        throw new Error("You must be signed in to submit an event.");
      }

      let coverImageUrl: string | null = null;
      if (image) {
        try {
          const uploaded = await uploadEventImage({
            uri: image.uri,
            userId: organizerId,
            mimeType: image.mimeType,
            fileSize: image.fileSize,
          });
          coverImageUrl = uploaded.publicUrl;
        } catch (uploadErr) {
          const uploadMessage = toErrorMessage(
            uploadErr,
            "Could not upload cover image.",
          );
          if (/row-level security/i.test(uploadMessage)) {
            throw new Error(
              "Cover image could not be uploaded. Try a JPEG or PNG under 5MB, or submit without an image.",
            );
          }
          throw uploadErr;
        }
      }

      const rpcArgs = {
        p_title: title.trim(),
        p_description: description.trim() || null,
        p_start_time: startAt.toISOString(),
        p_end_time: endAt ? endAt.toISOString() : null,
        p_publish_at: (publishAt ?? new Date()).toISOString(),
        p_location_name: locationName.trim() || null,
        p_category: category,
        p_university_name: universityName.trim() || null,
        p_club_name: clubName.trim() || null,
        p_cover_image_url: coverImageUrl,
        p_target_audience: targetAudience,
        p_external_registration_url: registrationUrl,
      };

      const { error: rpcError } = await supabase.rpc(
        "submit_pending_event",
        rpcArgs,
      );

      if (rpcError && /could not find the function/i.test(rpcError.message)) {
        const { error: insertError } = await supabase.from("events").insert([
          {
            title: rpcArgs.p_title,
            description: rpcArgs.p_description,
            start_time: rpcArgs.p_start_time,
            end_time: rpcArgs.p_end_time,
            publish_at: rpcArgs.p_publish_at,
            location_name: rpcArgs.p_location_name,
            category: rpcArgs.p_category,
            university_name: rpcArgs.p_university_name,
            club_name: rpcArgs.p_club_name,
            cover_image_url: rpcArgs.p_cover_image_url,
            target_audience: rpcArgs.p_target_audience,
            external_registration_url: rpcArgs.p_external_registration_url,
            organizer_id: organizerId,
            status: "pending",
          },
        ]);
        if (insertError) throw insertError;
      } else if (rpcError) {
        throw rpcError;
      }

      allowLeave();
      Alert.alert(
        "Submitted for review",
        "Your event will appear on the public feed once an admin approves it.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (caught) {
      const message = toErrorMessage(caught, "Failed to create event.");
      setError(
        /row-level security/i.test(message)
          ? "Could not save this event. Sign out, sign back in, and try again. If you added a cover image, try submitting once without it."
          : message,
      );
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    user,
    title,
    universityName,
    startAt,
    endAt,
    publishAt,
    image,
    description,
    category,
    clubName,
    locationName,
    targetAudience,
    externalRegistrationUrl,
    allowLeave,
    router,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Submit your event for review. It appears on the public feed once an
          admin approves it.
        </Text>

        <FormField
          label="Event Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Campus Tech Fest 2026"
        />

        <Select
          label="Category"
          value={category}
          options={EVENT_CATEGORY_OPTIONS}
          onChange={setCategory}
        />

        <FormField
          label="University Name (Optional)"
          value={universityName}
          onChangeText={setUniversityName}
          placeholder="e.g. University of Colombo"
        />

        <FormField
          label="Hosting Club / Society (Optional)"
          value={clubName}
          onChangeText={setClubName}
          placeholder="e.g. Computer Science Society"
        />

        <DateTimeField
          label="Start date & time"
          value={startAt}
          onChange={setStartAt}
        />
        <DateTimeField
          label="End date & time"
          value={endAt}
          onChange={setEndAt}
          optional
        />
        <DateTimeField
          label="Publish at"
          value={publishAt}
          onChange={setPublishAt}
          optional
          hint="Leave empty to publish when approved. A future date shows the event as Coming Soon until then."
        />

        <FormField
          label="Location"
          value={locationName}
          onChangeText={setLocationName}
          placeholder="e.g. Main Auditorium"
        />

        <Select
          label="Target Audience"
          value={targetAudience}
          options={EVENT_AUDIENCE_OPTIONS}
          onChange={setTargetAudience}
        />

        <FormField
          label="External Registration Link (Optional)"
          value={externalRegistrationUrl}
          onChangeText={setExternalRegistrationUrl}
          placeholder="https://example.com/register"
          autoCapitalize="none"
          keyboardType="url"
        />

        <ImagePickerField
          label="Cover Image"
          value={image}
          onChange={setImage}
        />

        <FormField
          label="Event Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Provide the exciting details about your event..."
          multiline
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={isSubmitting ? "Submitting…" : "Submit for Review"}
          loading={isSubmitting}
          onPress={() => void handleSubmit()}
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
  lead: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  error: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
});
