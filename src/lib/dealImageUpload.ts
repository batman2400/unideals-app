/**
 * Port of the web app's `src/lib/dealImageUpload.js`.
 * Uploads to the public `deal-images` bucket from a local image URI.
 */
import {
  extensionForMime,
  prepareImageForUpload,
} from "@/lib/compressImage";
import { supabase } from "@/lib/supabase";
import { uploadLocalFile } from "@/lib/uploadLocalFile";

export const DEAL_IMAGES_BUCKET = "deal-images";
const MAX_BYTES = 5 * 1024 * 1024;

function sanitizePathSegment(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export interface UploadDealImageInput {
  uri: string;
  userId: string;
  brandName: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

export interface UploadDealImageResult {
  publicUrl: string;
  filePath: string;
}

export async function uploadDealImage(
  input: UploadDealImageInput,
): Promise<UploadDealImageResult> {
  if (!input.userId) {
    throw new Error("Unable to resolve partner account for image upload.");
  }

  const prepared = await prepareImageForUpload({
    uri: input.uri,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    maxBytes: MAX_BYTES,
    tooLargeMessage: "Image is too large. Maximum size is 5MB.",
  });

  const brandSegment = sanitizePathSegment(input.brandName) || "brand";
  const ext = extensionForMime(prepared.mimeType);
  const filePath = `partners/${input.userId}/${brandSegment}/${Date.now()}-${randomSuffix()}.${ext}`;

  await uploadLocalFile({
    bucket: DEAL_IMAGES_BUCKET,
    path: filePath,
    uri: prepared.uri,
    contentType: prepared.mimeType,
    maxBytes: MAX_BYTES,
    tooLargeMessage: "Image is too large. Maximum size is 5MB.",
    errorMessage: "Failed to upload image.",
  });

  const { data } = supabase.storage
    .from(DEAL_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("Image uploaded but URL could not be resolved.");
  }

  return { publicUrl: data.publicUrl, filePath };
}
