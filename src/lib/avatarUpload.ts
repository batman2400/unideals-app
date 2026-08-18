/**
 * Avatar upload to the public `avatars` bucket.
 * Path matches the web app: `{userId}/avatar` (extension-free, upsert).
 */
import { supabase, toErrorMessage } from "@/lib/supabase";
import { uploadLocalFile } from "@/lib/uploadLocalFile";

export const AVATARS_BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function extensionFromMime(mimeType?: string | null): string {
  if (mimeType?.includes("png")) return "png";
  if (mimeType?.includes("webp")) return "webp";
  return "jpg";
}

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

  if (input.fileSize != null && input.fileSize > MAX_BYTES) {
    throw new Error("Image is too large. Maximum size is 5MB.");
  }

  if (input.mimeType && !ALLOWED_TYPES.includes(input.mimeType)) {
    throw new Error("Please upload a JPEG, PNG, or WEBP image.");
  }

  const ext = extensionFromMime(input.mimeType);
  const contentType = input.mimeType?.startsWith("image/")
    ? input.mimeType
    : `image/${ext === "jpg" ? "jpeg" : ext}`;
  const filePath = `${input.userId}/avatar`;

  await uploadLocalFile({
    bucket: AVATARS_BUCKET,
    path: filePath,
    uri: input.uri,
    contentType,
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
  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  });

  if (updateError) {
    throw new Error(toErrorMessage(updateError, "Couldn't save your photo."));
  }

  return { publicUrl };
}
