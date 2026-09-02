/**
 * Auth session storage.
 *
 * Native: Expo SecureStore (Android Keystore / iOS Keychain). Values are
 * chunked because SecureStore rejects payloads over ~2KB, and a Supabase
 * session JWT is often larger. Existing AsyncStorage sessions are copied
 * over on first read so users are not signed out by the migration.
 *
 * Web: AsyncStorage (SecureStore is not available).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CHUNK_SIZE = 1800;

type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function countKey(key: string): string {
  return `${key}.n`;
}

function partKey(key: string, index: number): string {
  return `${key}.${index}`;
}

async function readSecure(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(countKey(key));
  if (countRaw) {
    const count = Number(countRaw);
    if (!Number.isFinite(count) || count < 1) return null;
    let value = "";
    for (let i = 0; i < count; i += 1) {
      value += (await SecureStore.getItemAsync(partKey(key, i))) ?? "";
    }
    return value;
  }
  return SecureStore.getItemAsync(key);
}

async function writeSecure(key: string, value: string): Promise<void> {
  const previous = Number((await SecureStore.getItemAsync(countKey(key))) ?? "0");
  const chunks = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
  for (let i = 0; i < chunks; i += 1) {
    await SecureStore.setItemAsync(
      partKey(key, i),
      value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
    );
  }
  await SecureStore.setItemAsync(countKey(key), String(chunks));
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
  for (let i = chunks; i < previous; i += 1) {
    await SecureStore.deleteItemAsync(partKey(key, i)).catch(() => undefined);
  }
}

async function clearSecure(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(countKey(key));
  const count = Number(countRaw ?? "0");
  const limit = Number.isFinite(count) && count > 0 ? count : 8;
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
  await SecureStore.deleteItemAsync(countKey(key)).catch(() => undefined);
  for (let i = 0; i < limit; i += 1) {
    await SecureStore.deleteItemAsync(partKey(key, i)).catch(() => undefined);
  }
}

const nativeStorage: AuthStorage = {
  async getItem(key) {
    try {
      const fromSecure = await readSecure(key);
      if (fromSecure != null) return fromSecure;
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        await writeSecure(key, legacy);
        await AsyncStorage.removeItem(key);
        return legacy;
      }
      return null;
    } catch (error) {
      console.error("[auth-storage] getItem failed:", error);
      return AsyncStorage.getItem(key);
    }
  },

  async setItem(key, value) {
    try {
      await writeSecure(key, value);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("[auth-storage] setItem failed:", error);
      await AsyncStorage.setItem(key, value);
    }
  },

  async removeItem(key) {
    try {
      await clearSecure(key);
    } catch (error) {
      console.error("[auth-storage] removeItem failed:", error);
    }
    await AsyncStorage.removeItem(key);
  },
};

export function getAuthStorage(): AuthStorage {
  if (Platform.OS === "web") return AsyncStorage;
  return nativeStorage;
}
