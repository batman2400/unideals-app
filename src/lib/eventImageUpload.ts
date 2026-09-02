/**
 * Port of the web app's `src/lib/eventImageUpload.js`.
 * Uploads to the public `event-images` bucket from a local image URI.
 */
import { supabase } from "@/lib/supabase";
import { uploadLocalFile } from "@/lib/uploadLocalFile";

export const EVENT_IMAGES_BUCKET = "event-images";
const MAX_BYTES = 5 * 1024 * 1024;

function extensionFromUri(uri: string, mimeType?: string | null): string {
  if (mimeType?.includes("png")) return "png";
  if (mimeType?.includes("webp")) return "webp";
  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) return "jpg";
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() ?? "jpg";
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export interface UploadEventImageInput {
  uri: string;
  userId: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

export interface UploadEventImageResult {
  publicUrl: string;
  filePath: string;
}

export async function uploadEventImage(
  input: UploadEventImageInput,
): Promise<UploadEventImageResult> {
  if (input.fileSize != null && input.fileSize > MAX_BYTES) {
    throw new Error("Image must be 5MB or smaller.");
  }

  if (input.mimeType && !input.mimeType.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const ext = extensionFromUri(input.uri, input.mimeType);
  // Must be `{userId}/...` — storage RLS checks foldername(name)[1] = auth.uid()
  const filePath = `${input.userId}/${Date.now()}-${randomSuffix()}.${ext}`;
  const contentType = input.mimeType?.startsWith("image/")
    ? input.mimeType
    : `image/${ext === "jpg" ? "jpeg" : ext}`;

  await uploadLocalFile({
    bucket: EVENT_IMAGES_BUCKET,
    path: filePath,
    uri: input.uri,
    contentType,
    maxBytes: MAX_BYTES,
    tooLargeMessage: "Image must be 5MB or smaller.",
    errorMessage: "Could not upload cover image.",
  });

  const { data } = supabase.storage
    .from(EVENT_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("Image uploaded but URL could not be resolved.");
  }

  return { publicUrl: data.publicUrl, filePath };
}
