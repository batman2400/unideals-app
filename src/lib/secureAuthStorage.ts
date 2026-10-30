/**
 * Auth session storage.
 *
 * Native: Expo SecureStore (Android Keystore / iOS Keychain). Values are
 * chunked because SecureStore rejects payloads over ~2KB, and a Supabase
 * session JWT is often larger. Existing AsyncStorage sessions are copied
 * over on first read so users are not signed out by the migration.
 *
 * Hot reads stay in memory after the first Keychain read. Supabase calls
 * `auth.getSession()` before every table and RPC request; reading Keychain
 * chunks on every query queues behind push-token setup (`withKeychainLock`)
 * and stalls navigation when `getExpoPushTokenAsync` hangs on the network.
 * Deletes are on the same timeout: a Keychain write that stalls after the
 * app returns from the background must not leave Sign out spinning.
 *
 * Web: AsyncStorage (SecureStore is not available).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { withKeychainLock } from "@/lib/keychainLock";

const CHUNK_SIZE = 1800;
const KEYCHAIN_STEP_TIMEOUT_MS = 4000;

type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const memoryStore = new Map<string, string | null>();
const inFlightReads = new Map<string, Promise<string | null>>();

function countKey(key: string): string {
  return `${key}.n`;
}

function partKey(key: string, index: number): string {
  return `${key}.${index}`;
}

function withStepTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[auth-storage] ${label} timed out`));
    }, KEYCHAIN_STEP_TIMEOUT_MS);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function readSecure(key: string): Promise<string | null> {
  const countRaw = await withStepTimeout(
    SecureStore.getItemAsync(countKey(key)),
    "getItem count",
  );
  if (countRaw) {
    const count = Number(countRaw);
    if (!Number.isFinite(count) || count < 1) return null;
    let value = "";
    for (let i = 0; i < count; i += 1) {
      value +=
        (await withStepTimeout(
          SecureStore.getItemAsync(partKey(key, i)),
          `getItem part ${i}`,
        )) ?? "";
    }
    return value;
  }
  return withStepTimeout(SecureStore.getItemAsync(key), "getItem");
}

function deleteSecure(key: string): Promise<void> {
  return withStepTimeout(SecureStore.deleteItemAsync(key), `delete ${key}`).catch(
    (error: unknown) => {
      console.warn("[auth-storage] delete skipped:", error);
    },
  );
}

async function writeSecure(key: string, value: string): Promise<void> {
  const previous = Number(
    (await withStepTimeout(
      SecureStore.getItemAsync(countKey(key)),
      "read previous count",
    )) ?? "0",
  );
  const chunks = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
  for (let i = 0; i < chunks; i += 1) {
    await withStepTimeout(
      SecureStore.setItemAsync(
        partKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      ),
      `setItem part ${i}`,
    );
  }
  await withStepTimeout(
    SecureStore.setItemAsync(countKey(key), String(chunks)),
    "setItem count",
  );
  await deleteSecure(key);
  for (let i = chunks; i < previous; i += 1) {
    await deleteSecure(partKey(key, i));
  }
}

async function clearSecure(key: string): Promise<void> {
  const countRaw = await withStepTimeout(
    SecureStore.getItemAsync(countKey(key)),
    "clear count",
  ).catch(() => null);
  const count = Number(countRaw ?? "0");
  const limit = Number.isFinite(count) && count > 0 ? count : 8;
  // One Keychain call at a time. Overlapping SecItem calls crash iOS 26.
  await deleteSecure(key);
  await deleteSecure(countKey(key));
  for (let i = 0; i < limit; i += 1) {
    await deleteSecure(partKey(key, i));
  }
}

const nativeStorage: AuthStorage = {
  getItem(key) {
    if (memoryStore.has(key)) {
      return Promise.resolve(memoryStore.get(key) ?? null);
    }

    const existingRead = inFlightReads.get(key);
    if (existingRead) return existingRead;

    const readPromise = withKeychainLock(async () => {
      if (memoryStore.has(key)) {
        return memoryStore.get(key) ?? null;
      }

      try {
        const fromSecure = await readSecure(key);
        if (fromSecure != null) {
          memoryStore.set(key, fromSecure);
          return fromSecure;
        }
        const legacy = await AsyncStorage.getItem(key);
        if (legacy != null) {
          memoryStore.set(key, legacy);
          await writeSecure(key, legacy).catch(() => undefined);
          await AsyncStorage.removeItem(key).catch(() => undefined);
          return legacy;
        }
        memoryStore.set(key, null);
        return null;
      } catch (error) {
        console.error("[auth-storage] getItem failed:", error);
        const fallback = await AsyncStorage.getItem(key).catch(() => null);
        memoryStore.set(key, fallback);
        return fallback;
      }
    }).finally(() => {
      inFlightReads.delete(key);
    });

    inFlightReads.set(key, readPromise);
    return readPromise;
  },

  setItem(key, value) {
    memoryStore.set(key, value);
    return withKeychainLock(async () => {
      try {
        await writeSecure(key, value);
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.error("[auth-storage] setItem failed:", error);
        await AsyncStorage.setItem(key, value);
      }
    });
  },

  removeItem(key) {
    memoryStore.set(key, null);
    return withKeychainLock(async () => {
      try {
        await clearSecure(key);
      } catch (error) {
        console.error("[auth-storage] removeItem failed:", error);
      }
      await AsyncStorage.removeItem(key);
    });
  },
};

export function getAuthStorage(): AuthStorage {
  if (Platform.OS === "web") return AsyncStorage;
  return nativeStorage;
}
