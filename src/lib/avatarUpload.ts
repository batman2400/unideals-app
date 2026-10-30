/**
 * Avatar upload to the public `avatars` bucket.
 * Path matches the web app: `{userId}/avatar` (extension-free, upsert).
 */
import { prepareImageForUpload } from "@/lib/compressImage";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { uploadLocalFile } from "@/lib/uploadLocalFile";
import { REQUEST_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";

export const AVATARS_BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface UploadAvatarInput {
  uri: string;
  userId: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

export interface UploadAvatarResult {
  publicUrl: string;
}

export async function uploadAvatar(
  input: UploadAvatarInput,
): Promise<UploadAvatarResult> {
  if (!input.userId) {
    throw new Error("You must be signed in to upload an avatar.");
  }

  const prepared = await prepareImageForUpload({
    uri: input.uri,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    maxEdge: 1024,
    maxBytes: MAX_BYTES,
    tooLargeMessage: "Image is too large. Maximum size is 5MB.",
  });

  if (!ALLOWED_TYPES.includes(prepared.mimeType)) {
    throw new Error("Please upload a JPEG, PNG, or WEBP image.");
  }

  const filePath = `${input.userId}/avatar`;

  await uploadLocalFile({
    bucket: AVATARS_BUCKET,
    path: filePath,
    uri: prepared.uri,
    contentType: prepared.mimeType,
    upsert: true,
    maxBytes: MAX_BYTES,
    tooLargeMessage: "Image is too large. Maximum size is 5MB.",
    errorMessage: "Couldn't upload that image.",
  });

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath);
  if (!data.publicUrl) {
    throw new Error("Image uploaded but URL could not be resolved.");
  }

  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
  const { error: updateError } = await withTimeout(
    supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    }),
    REQUEST_TIMEOUT_MS,
    "Saving your photo is taking too long. Check your connection and try again.",
  );

  if (updateError) {
    throw new Error(toErrorMessage(updateError, "Couldn't save your photo."));
  }

  return { publicUrl };
}
