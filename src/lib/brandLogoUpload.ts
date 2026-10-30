/**
 * Port of the web app's `src/lib/brandLogoUpload.js`.
 * Uploads to the public `brand-logos` bucket from a local image URI.
 */
import {
  extensionForMime,
  prepareImageForUpload,
} from "@/lib/compressImage";
import { supabase } from "@/lib/supabase";
import { uploadLocalFile } from "@/lib/uploadLocalFile";

export const BRAND_LOGOS_BUCKET = "brand-logos";
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

export interface UploadBrandLogoInput {
  uri: string;
  brandName: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

export interface UploadBrandLogoResult {
  publicUrl: string;
  filePath: string;
}

export async function uploadBrandLogo(
  input: UploadBrandLogoInput,
): Promise<UploadBrandLogoResult> {
  if (!input.brandName.trim()) {
    throw new Error("Brand name is required.");
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
  const filePath = `logos/${brandSegment}-${Date.now()}-${randomSuffix()}.${ext}`;

  await uploadLocalFile({
    bucket: BRAND_LOGOS_BUCKET,
    path: filePath,
    uri: prepared.uri,
    contentType: prepared.mimeType,
    maxBytes: MAX_BYTES,
    tooLargeMessage: "Image is too large. Maximum size is 5MB.",
    errorMessage: "Failed to upload logo.",
  });

  const { data } = supabase.storage
    .from(BRAND_LOGOS_BUCKET)
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("Logo uploaded but URL could not be resolved.");
  }

  return { publicUrl: data.publicUrl, filePath };
}

const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function uploadApplicationLogo(input: {
  uri: string;
  userId: string;
  mimeType?: string | null;
  fileSize?: number | null;
}): Promise<UploadBrandLogoResult> {
  if (!USER_ID_PATTERN.test(input.userId)) {
    throw new Error("Sign in again before uploading a logo.");
  }

  const prepared = await prepareImageForUpload({
    uri: input.uri,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    maxBytes: MAX_BYTES,
    tooLargeMessage: "Image is too large. Maximum size is 5MB.",
  });

  const ext = extensionForMime(prepared.mimeType);
  const filePath = `applications/${input.userId}/${Date.now()}-${randomSuffix()}.${ext}`;

  await uploadLocalFile({
    bucket: BRAND_LOGOS_BUCKET,
    path: filePath,
    uri: prepared.uri,
    contentType: prepared.mimeType,
    maxBytes: MAX_BYTES,
    tooLargeMessage: "Image is too large. Maximum size is 5MB.",
    errorMessage: "Failed to upload logo.",
  });

  const { data } = supabase.storage
    .from(BRAND_LOGOS_BUCKET)
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("Logo uploaded but URL could not be resolved.");
  }

  return { publicUrl: data.publicUrl, filePath };
}
