import { supabase } from "@/lib/supabase";
import { uploadLocalFile } from "@/lib/uploadLocalFile";

const PROOF_BUCKET = "verification-documents";

function extensionFromMime(mimeType: string | null, fileName?: string | null): string {
  const fromName = fileName?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
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
  const ext = extensionFromMime(input.mimeType, input.fileName);
  const filePath = `${input.userId}/${input.side}-${Date.now()}.${ext}`;
  await uploadLocalFile({
    bucket: PROOF_BUCKET,
    path: filePath,
    uri: input.uri,
    contentType: input.mimeType ?? "image/jpeg",
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
