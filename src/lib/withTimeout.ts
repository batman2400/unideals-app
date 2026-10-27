export const IMAGE_UPLOAD_TIMEOUT_MS = 45_000;
export const SAVE_TIMEOUT_MS = 30_000;
export const REQUEST_TIMEOUT_MS = 20_000;

export const IMAGE_UPLOAD_TIMEOUT_MESSAGE =
  "The upload is taking too long. Your details are still here. Check your connection and try again.";

/** Stops a spinner when a request never comes back. The original request may still finish. */
export function withTimeout<T>(
  promiseLike: PromiseLike<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([Promise.resolve(promiseLike), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function tookTooLongMessage(action: string, alreadyDone: string): string {
  return `${action} is taking too long. Your details are still here. Check your connection and try again. If it keeps happening, wait a minute first: ${alreadyDone}`;
}
