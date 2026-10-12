/**
 * One-at-a-time gate for iOS Keychain calls.
 *
 * The session store (expo-secure-store) and push setup (expo-notifications)
 * both call SecItemCopyMatching. On iOS 26 those overlap and the process is
 * killed with EXC_BAD_ACCESS inside the Keychain encoder. Callers that touch
 * the Keychain go through this lock so the native calls cannot overlap.
 */
let tail: Promise<unknown> = Promise.resolve();

export function withKeychainLock<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(() => task());
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
