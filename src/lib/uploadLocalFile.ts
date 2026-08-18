/**
 * React Native-safe storage upload.
 *
 * `Blob` from `fetch().blob()` is unreliable in RN (Hermes / Expo). Read the
 * local URI as an ArrayBuffer and pass that to `supabase.storage.upload`.
 */
import { supabase, toErrorMessage } from "@/lib/supabase";

export interface UploadLocalFileInput {
  bucket: string;
  path: string;
  uri: string;
  contentType: string;
  upsert?: boolean;
  cacheControl?: string;
  maxBytes?: number;
  tooLargeMessage?: string;
  errorMessage?: string;
}

export async function uploadLocalFile(
  input: UploadLocalFileInput,
): Promise<{ byteLength: number }> {
  const response = await fetch(input.uri);
  if (!response.ok) {
    throw new Error("Could not read the selected file.");
  }

  const body = await response.arrayBuffer();

  if (input.maxBytes != null && body.byteLength > input.maxBytes) {
    throw new Error(input.tooLargeMessage ?? "File is too large.");
  }

  const { error } = await supabase.storage.from(input.bucket).upload(input.path, body, {
    contentType: input.contentType,
    upsert: input.upsert ?? false,
    cacheControl: input.cacheControl ?? "3600",
  });

  if (error) {
    throw new Error(toErrorMessage(error, input.errorMessage ?? "Could not upload file."));
  }

  return { byteLength: body.byteLength };
}
