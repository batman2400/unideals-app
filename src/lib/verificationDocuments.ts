import { supabase } from "@/lib/supabase";
import { uploadLocalFile } from "@/lib/uploadLocalFile";

const PROOF_BUCKET = "verification-documents";

export const ID_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const ID_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type AllowedIdMime = (typeof ID_UPLOAD_MIME_TYPES)[number];

function isAllowedMime(value: string): value is AllowedIdMime {
  return (ID_UPLOAD_MIME_TYPES as readonly string[]).includes(value);
}

/** Rejects HEIC and other types the website also refuses. */
export function assertIdImageType(
  mimeType: string | null | undefined,
  fileName?: string | null,
): AllowedIdMime {
  const fromMime = ((mimeType ?? "").toLowerCase().split(";")[0] ?? "").trim();
  if (isAllowedMime(fromMime)) return fromMime;

  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";

  throw new Error("Please upload a JPEG, PNG, or WEBP image.");
}

function extensionFromMime(mimeType: AllowedIdMime): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadVerificationImage(input: {
  userId: string;
  uri: string;
  mimeType: string | null;
  fileName?: string | null;
  side: "front" | "back";
}): Promise<string> {
  const mimeType = assertIdImageType(input.mimeType, input.fileName);
  const ext = extensionFromMime(mimeType);
  const filePath = `${input.userId}/${input.side}-${Date.now()}.${ext}`;
  await uploadLocalFile({
    bucket: PROOF_BUCKET,
    path: filePath,
    uri: input.uri,
    contentType: mimeType,
    maxBytes: ID_UPLOAD_MAX_BYTES,
    tooLargeMessage: "That file is too large. The limit is 5MB.",
    errorMessage: "Could not upload that ID photo.",
  });
  return filePath;
}

export async function notifyVerificationRejected(requestId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("send-verification-rejected", {
    body: { request_id: requestId },
  });
  if (error) {
    console.error("Could not send verification reject email:", error);
  }
}
