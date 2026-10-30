/**
 * One-at-a-time gate for iOS Keychain calls.
 *
 * The session store (expo-secure-store) and push setup (expo-notifications)
 * both call SecItemCopyMatching. On iOS 26 those overlap and the process is
 * killed with EXC_BAD_ACCESS inside the Keychain encoder. Callers that touch
 * the Keychain go through this lock so the native calls cannot overlap.
 *
 * A safety timeout releases the queue if a caller ever hangs in native code,
 * so one stuck call cannot freeze every later Keychain read.
 */
const LOCK_HOLD_TIMEOUT_MS = 6000;

let tail: Promise<unknown> = Promise.resolve();

function releaseAfterTimeout(promise: Promise<unknown>): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, LOCK_HOLD_TIMEOUT_MS);
    promise.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

export function withKeychainLock<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(() => task());
  tail = releaseAfterTimeout(run);
  return run;
}
