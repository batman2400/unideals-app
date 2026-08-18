/**
 * Last-known role on device. Used so a cold start can open the right
 * partner/admin routes without waiting on the network role lookup.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { isUserRole, type UserRole } from "@/types/database";

const ROLE_CACHE_KEY = "unideals.role-cache";

export interface CachedUserRole {
  userId: string;
  role: UserRole;
  isVerified: boolean;
  verifiedAt: string | null;
}

const canUseStorage = typeof window !== "undefined";

export async function readCachedUserRole(): Promise<CachedUserRole | null> {
  if (!canUseStorage) return null;

  try {
    const raw = await AsyncStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    if (typeof record.userId !== "string" || !isUserRole(record.role)) {
      return null;
    }

    return {
      userId: record.userId,
      role: record.role,
      isVerified: record.isVerified === true,
      verifiedAt:
        typeof record.verifiedAt === "string" ? record.verifiedAt : null,
    };
  } catch {
    return null;
  }
}

export async function writeCachedUserRole(
  value: CachedUserRole,
): Promise<void> {
  if (!canUseStorage) return;

  try {
    await AsyncStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(value));
  } catch {
    // Cache is an optimization; ignore write failures.
  }
}

export async function clearCachedUserRole(): Promise<void> {
  if (!canUseStorage) return;

  try {
    await AsyncStorage.removeItem(ROLE_CACHE_KEY);
  } catch {
    // Ignore.
  }
}
