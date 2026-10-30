/**
 * Shrinks a picked photo before upload.
 *
 * Phone gallery images keep their full pixel size after the picker, and
 * Android often omits the file size, so a multi-megabyte photo was read and
 * uploaded until the 45s timer gave up. Resize the long edge and save a JPEG
 * first. Already-small JPEG, PNG, and WEBP files are left as they are.
 */
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { withTimeout } from "@/lib/withTimeout";

export const COMPRESSED_IMAGE_MAX_EDGE = 1600;
/** High enough that logo lettering stays sharp. Size drops because of the resize, not a heavy JPEG crush. */
export const COMPRESSED_IMAGE_QUALITY = 0.88;
const SIZE_READ_TIMEOUT_MS = 8_000;
const SKIP_COMPRESS_MAX_BYTES = 4 * 1024 * 1024;

const PASSTHROUGH_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export interface CompressImageInput {
  uri: string;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  mimeType?: string | null;
  maxEdge?: number;
  compress?: number;
}

export interface CompressedImage {
  uri: string;
  mimeType: string;
  fileSize: number | null;
  width: number;
  height: number;
}

const PREPARE_TIMEOUT_MS = 30_000;

export function resizeToMaxEdge(
  width: number,
  height: number,
  maxEdge: number,
): { width: number } | { height: number } | null {
  if (width <= 0 || height <= 0 || Math.max(width, height) <= maxEdge) {
    return null;
  }
  return width >= height ? { width: maxEdge } : { height: maxEdge };
}

export function extensionForMime(
  mimeType: string | null | undefined,
  fallback = "jpg",
): string {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return fallback;
}

function normalizeMime(mimeType: string | null | undefined): string {
  const mime = (mimeType ?? "").toLowerCase().split(";")[0]?.trim() ?? "";
  return mime === "image/jpg" ? "image/jpeg" : mime;
}

/** Gallery URIs (`content://`, `ph://`) can stall `fetch` on Android. */
function isGalleryUri(uri: string): boolean {
  return /^(content|ph|assets-library):/i.test(uri);
}

function canSkipCompression(input: CompressImageInput, maxEdge: number): boolean {
  const width = input.width ?? 0;
  const height = input.height ?? 0;
  const mime = normalizeMime(input.mimeType);
  return (
    !isGalleryUri(input.uri) &&
    input.fileSize != null &&
    input.fileSize <= SKIP_COMPRESS_MAX_BYTES &&
    width > 0 &&
    height > 0 &&
    Math.max(width, height) <= maxEdge &&
    PASSTHROUGH_TYPES.has(mime)
  );
}

function canKeepOriginal(input: CompressImageInput): boolean {
  const mime = normalizeMime(input.mimeType);
  return (
    !isGalleryUri(input.uri) &&
    input.fileSize != null &&
    input.fileSize <= SKIP_COMPRESS_MAX_BYTES &&
    PASSTHROUGH_TYPES.has(mime)
  );
}

async function byteLengthOf(uri: string): Promise<number | null> {
  const response = await fetch(uri);
  if (!response.ok) return null;
  const body = await response.arrayBuffer();
  return body.byteLength;
}

export async function compressImage(
  input: CompressImageInput,
): Promise<CompressedImage> {
  const maxEdge = input.maxEdge ?? COMPRESSED_IMAGE_MAX_EDGE;
  const compress = input.compress ?? COMPRESSED_IMAGE_QUALITY;
  const mime = normalizeMime(input.mimeType);

  if (canSkipCompression(input, maxEdge)) {
    return {
      uri: input.uri,
      mimeType: mime,
      fileSize: input.fileSize ?? null,
      width: input.width ?? 0,
      height: input.height ?? 0,
    };
  }

  const context = ImageManipulator.manipulate(input.uri);
  const planned = resizeToMaxEdge(input.width ?? 0, input.height ?? 0, maxEdge);
  if (planned) context.resize(planned);

  let rendered = await context.renderAsync();
  let didResize = planned != null;
  if (Math.max(rendered.width, rendered.height) > maxEdge) {
    const again = ImageManipulator.manipulate(rendered);
    const second = resizeToMaxEdge(rendered.width, rendered.height, maxEdge);
    if (second) again.resize(second);
    rendered = await again.renderAsync();
    didResize = true;
  }

  const keepOriginal = !didResize && canKeepOriginal(input);
  if (keepOriginal && !isGalleryUri(input.uri)) {
    return {
      uri: input.uri,
      mimeType: mime,
      fileSize: input.fileSize ?? null,
      width: rendered.width,
      height: rendered.height,
    };
  }

  const format = keepOriginal ? saveFormatForMime(mime) : SaveFormat.JPEG;
  const saved = await rendered.saveAsync({
    compress: format === SaveFormat.PNG ? 1 : compress,
    format,
  });
  let fileSize: number | null = null;
  try {
    fileSize = await withTimeout(
      byteLengthOf(saved.uri),
      SIZE_READ_TIMEOUT_MS,
      "Could not read the prepared image.",
    );
  } catch {
    fileSize = null;
  }

  return {
    uri: saved.uri,
    mimeType: mimeForSaveFormat(format),
    fileSize,
    width: saved.width,
    height: saved.height,
  };
}

function saveFormatForMime(mime: string): SaveFormat {
  if (mime.includes("png")) return SaveFormat.PNG;
  if (mime.includes("webp")) return SaveFormat.WEBP;
  return SaveFormat.JPEG;
}

function mimeForSaveFormat(format: SaveFormat): string {
  if (format === SaveFormat.PNG) return "image/png";
  if (format === SaveFormat.WEBP) return "image/webp";
  return "image/jpeg";
}

/** Resize before the size check so a large gallery photo is not rejected or uploaded whole. */
export async function prepareImageForUpload(
  input: CompressImageInput & { maxBytes: number; tooLargeMessage: string },
): Promise<CompressedImage> {
  if (input.mimeType && !input.mimeType.toLowerCase().startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const prepared = await withTimeout(
    compressImage(input),
    PREPARE_TIMEOUT_MS,
    "The image is taking too long to prepare. Try another photo.",
  );
  if (prepared.fileSize != null && prepared.fileSize > input.maxBytes) {
    throw new Error(input.tooLargeMessage);
  }
  return prepared;
}
