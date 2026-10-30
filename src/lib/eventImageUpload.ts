/**
 * Port of the web app's `src/lib/eventImageUpload.js`.
 * Uploads to the public `event-images` bucket from a local image URI.
 */
import {
  extensionForMime,
  prepareImageForUpload,
} from "@/lib/compressImage";
import { supabase } from "@/lib/supabase";
import { uploadLocalFile } from "@/lib/uploadLocalFile";

export const EVENT_IMAGES_BUCKET = "event-images";
const MAX_BYTES = 5 * 1024 * 1024;

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
  const prepared = await prepareImageForUpload({
    uri: input.uri,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    maxBytes: MAX_BYTES,
    tooLargeMessage: "Image must be 5MB or smaller.",
  });

  const ext = extensionForMime(prepared.mimeType);
  // Must be `{userId}/...` — storage RLS checks foldername(name)[1] = auth.uid()
  const filePath = `${input.userId}/${Date.now()}-${randomSuffix()}.${ext}`;

  await uploadLocalFile({
    bucket: EVENT_IMAGES_BUCKET,
    path: filePath,
    uri: prepared.uri,
    contentType: prepared.mimeType,
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
