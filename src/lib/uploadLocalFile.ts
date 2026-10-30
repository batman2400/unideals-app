/**
 * React Native-safe storage upload.
 *
 * `Blob` from `fetch().blob()` is unreliable in RN (Hermes / Expo). Read the
 * local URI as an ArrayBuffer and pass that to `supabase.storage.upload`.
 * The read and the storage call each have their own timer: a stuck gallery
 * URI or a stalled request used to leave the button spinning.
 */
import { supabase, toErrorMessage } from "@/lib/supabase";
import {
  IMAGE_UPLOAD_TIMEOUT_MESSAGE,
  IMAGE_UPLOAD_TIMEOUT_MS,
  withTimeout,
} from "@/lib/withTimeout";

const LOCAL_READ_TIMEOUT_MS = 20_000;

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

async function readUri(uri: string): Promise<ArrayBuffer> {
  const response = await withTimeout(
    fetch(uri),
    LOCAL_READ_TIMEOUT_MS,
    "Could not read the selected file.",
  );
  if (!response.ok) {
    throw new Error("Could not read the selected file.");
  }
  const body = await withTimeout(
    response.arrayBuffer(),
    LOCAL_READ_TIMEOUT_MS,
    "Could not read the selected file.",
  );
  if (body.byteLength <= 0) {
    throw new Error("Could not read the selected file.");
  }
  return body;
}

export async function uploadLocalFile(
  input: UploadLocalFileInput,
): Promise<{ byteLength: number }> {
  const body = await readUri(input.uri);

  if (input.maxBytes != null && body.byteLength > input.maxBytes) {
    throw new Error(input.tooLargeMessage ?? "File is too large.");
  }

  const { error } = await withTimeout(
    supabase.storage.from(input.bucket).upload(input.path, body, {
      contentType: input.contentType,
      upsert: input.upsert ?? false,
      cacheControl: input.cacheControl ?? "3600",
    }),
    IMAGE_UPLOAD_TIMEOUT_MS,
    IMAGE_UPLOAD_TIMEOUT_MESSAGE,
  );

  if (error) {
    throw new Error(toErrorMessage(error, input.errorMessage ?? "Could not upload file."));
  }

  return { byteLength: body.byteLength };
}
