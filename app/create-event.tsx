import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { KeyboardFormScroll } from "@/components/KeyboardForm";
import { DateTimeField } from "@/components/DateTimeField";
import { FormField } from "@/components/FormField";
import {
  ImagePickerField,
  type PickedImage,
} from "@/components/ImagePickerField";
import { LocationField } from "@/components/LocationField";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/AuthContext";
import { validateSchedule } from "@/lib/dealForm";
import { uploadEventImage } from "@/lib/eventImageUpload";
import { asHttpUrl } from "@/lib/httpUrl";
import { validateLocation } from "@/lib/maps";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { colors, radius, spacing } from "@/theme";
import {
  IMAGE_UPLOAD_TIMEOUT_MESSAGE,
  IMAGE_UPLOAD_TIMEOUT_MS,
} from "@/lib/withTimeout";
import {
  EVENT_AUDIENCE_OPTIONS,
  EVENT_CATEGORY_OPTIONS,
  type EventAudience,
  type EventCategory,
} from "@/types/database";

const SUBMIT_TIMEOUT_MS = 20_000;

class SubmitTimeoutError extends Error {
  constructor() {
    super("SUBMIT_TIMEOUT");
    this.name = "SubmitTimeoutError";
  }
}

/** A stalled upload or save would otherwise leave the button spinning. */
function withTimeout<T>(
  promiseLike: PromiseLike<T>,
  ms = SUBMIT_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SubmitTimeoutError()), ms);
  });
  return Promise.race([Promise.resolve(promiseLike), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function explainSubmitError(error: unknown): string {
  if (error instanceof SubmitTimeoutError) {
    return "This is taking too long. Your details are still here. Check your connection and try again. If it keeps happening, wait a minute first: the event may already have been saved, and it stays hidden until an admin approves it.";
  }
  const message = toErrorMessage(error, "Failed to create event.");
  if (/row-level security/i.test(message)) {
    return "Could not save this event. Sign out, sign back in, and try again. If you added a cover image, try submitting once without it.";
  }
  return message;
}

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
  const [locationAddress, setLocationAddress] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [targetAudience, setTargetAudience] =
    useState<EventAudience>("all_students");
  const [externalRegistrationUrl, setExternalRegistrationUrl] = useState("");
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [publishAt, setPublishAt] = useState<Date | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inFlightRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const isDirty = useMemo(
    () =>
      Boolean(
        title.trim() ||
          description.trim() ||
          universityName.trim() ||
          clubName.trim() ||
          locationName.trim() ||
          locationAddress.trim() ||
          externalRegistrationUrl.trim() ||
          startAt ||
          endAt ||
          publishAt ||
          image ||
          isOnline ||
          category !== "social" ||
          targetAudience !== "all_students",
      ),
    [
      title,
      description,
      universityName,
      clubName,
      locationName,
      locationAddress,
      isOnline,
      externalRegistrationUrl,
      startAt,
      endAt,
      publishAt,
      image,
      category,
      targetAudience,
    ],
  );
  useUnsavedChangesGuard(isDirty);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setCategory("social");
    setUniversityName("");
    setClubName("");
    setLocationName("");
    setLocationAddress("");
    setIsOnline(false);
    setTargetAudience("all_students");
    setExternalRegistrationUrl("");
    setStartAt(null);
    setEndAt(null);
    setPublishAt(null);
    setImage(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (inFlightRef.current) return;
    setError(null);
    setSuccess(false);
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
    if (startAt.getTime() < Date.now() - 60 * 1000) {
      setError(
        "That start time has already passed. Pick a new start date and time in the future.",
      );
      return;
    }

    const locationError = validateLocation(
      { name: locationName, address: locationAddress },
      { required: !isOnline, requireAddress: false, subject: "Venue" },
    );
    if (locationError) {
      setError(locationError);
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

    try {
      // The screen already holds the signed-in user. Calling auth.getUser()
      // here waits on the auth lock and can hang on repeat submits. The
      // server sets the real organizer from the session anyway.
      const organizerId = user.id;
      if (!organizerId) {
        throw new Error("You must be signed in to submit an event.");
      }

      let coverImageUrl: string | null = null;
      if (image) {
        try {
          const uploaded = await withTimeout(
            uploadEventImage({
              uri: image.uri,
              userId: organizerId,
              mimeType: image.mimeType,
              fileSize: image.fileSize,
            }),
            IMAGE_UPLOAD_TIMEOUT_MS,
          );
          coverImageUrl = uploaded.publicUrl;
        } catch (uploadErr) {
          if (uploadErr instanceof SubmitTimeoutError) {
            throw new Error(IMAGE_UPLOAD_TIMEOUT_MESSAGE);
          }
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
        p_location_name: isOnline ? null : locationName.trim() || null,
        p_location_address: isOnline ? null : locationAddress.trim() || null,
        p_is_online: isOnline,
        p_category: category,
        p_university_name: universityName.trim() || null,
        p_club_name: clubName.trim() || null,
        p_cover_image_url: coverImageUrl,
        p_target_audience: targetAudience,
        p_external_registration_url: registrationUrl,
      };

      const { error: rpcError } = await withTimeout(
        supabase.rpc("submit_pending_event", rpcArgs),
      );

      if (rpcError && /could not find the function/i.test(rpcError.message)) {
        const { error: insertError } = await withTimeout(
          supabase.from("events").insert([
            {
              title: rpcArgs.p_title,
              description: rpcArgs.p_description,
              start_time: rpcArgs.p_start_time,
              end_time: rpcArgs.p_end_time,
              publish_at: rpcArgs.p_publish_at,
              location_name: rpcArgs.p_location_name,
              location_address: rpcArgs.p_location_address,
              is_online: rpcArgs.p_is_online,
              category: rpcArgs.p_category,
              university_name: rpcArgs.p_university_name,
              club_name: rpcArgs.p_club_name,
              cover_image_url: rpcArgs.p_cover_image_url,
              target_audience: rpcArgs.p_target_audience,
              external_registration_url: rpcArgs.p_external_registration_url,
              organizer_id: organizerId,
              status: "pending",
            },
          ]),
        );
        if (insertError) throw insertError;
      } else if (rpcError) {
        throw rpcError;
      }

      setSuccess(true);
      resetForm();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (caught) {
      setError(explainSubmitError(caught));
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
    locationAddress,
    isOnline,
    targetAudience,
    externalRegistrationUrl,
    resetForm,
  ]);

  return (
    <KeyboardFormScroll
      ref={scrollRef}
      style={styles.root}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.lg,
      }}
    >
        {success ? (
          <View style={styles.success}>
            <Text style={styles.successTitle}>Event submitted</Text>
            <Text style={styles.successBody}>
              Your event is saved and pending review. It will not show on the
              public feed until an admin approves it. You can submit another
              event below.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.successLinkHit}
            >
              <Text style={styles.successLink}>Back to Events</Text>
            </Pressable>
          </View>
        ) : null}

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

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: isOnline }}
          onPress={() => setIsOnline((current) => !current)}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleLabel}>
            This is an online event (no physical venue)
          </Text>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{
              false: colors.outlineVariant,
              true: colors.primaryContainer,
            }}
            thumbColor={isOnline ? colors.primary : colors.surfaceContainerHighest}
          />
        </Pressable>

        {!isOnline ? (
          <LocationField
            required
            addressRequired={false}
            nameLabel="Venue"
            namePlaceholder="e.g. Main Auditorium"
            name={locationName}
            address={locationAddress}
            onChangeName={setLocationName}
            onChangeAddress={setLocationAddress}
            addressPlaceholder="e.g. University of Colombo, Reid Ave, Colombo 7"
            hint="Recommended. Attendees can tap it to open Maps, so include the campus or street."
          />
        ) : null}

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
    </KeyboardFormScroll>
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  error: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  success: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
  },
  successBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onPrimaryContainer,
  },
  successLinkHit: {
    alignSelf: "flex-start",
  },
  successLink: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onPrimaryFixed,
    textDecorationLine: "underline",
  },
});
