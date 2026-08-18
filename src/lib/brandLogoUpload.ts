/**
 * Port of the web app's `src/lib/brandLogoUpload.js`.
 * Uploads to the public `brand-logos` bucket from a local image URI.
 */
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

function extensionFromUri(uri: string, mimeType?: string | null): string {
  if (mimeType?.includes("png")) return "png";
  if (mimeType?.includes("webp")) return "webp";
  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) return "jpg";
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() ?? "png";
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

  if (input.fileSize != null && input.fileSize > MAX_BYTES) {
    throw new Error("Image is too large. Maximum size is 5MB.");
  }

  if (input.mimeType && !input.mimeType.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const brandSegment = sanitizePathSegment(input.brandName) || "brand";
  const ext = extensionFromUri(input.uri, input.mimeType);
  const filePath = `logos/${brandSegment}-${Date.now()}-${randomSuffix()}.${ext}`;
  const contentType = input.mimeType?.startsWith("image/")
    ? input.mimeType
    : `image/${ext === "jpg" ? "jpeg" : ext}`;

  await uploadLocalFile({
    bucket: BRAND_LOGOS_BUCKET,
    path: filePath,
    uri: input.uri,
    contentType,
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
