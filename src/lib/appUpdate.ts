import Constants from "expo-constants";
import { Platform } from "react-native";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * Store-version gate. JavaScript fixes can still ship as an over-the-air
 * bundle. This check only sends people to the store when the installed
 * binary is older than `app_update_policy.min_store_version`.
 *
 * If the policy cannot be reached, the app opens on the build it already has.
 */

const ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=co.unideals.app";
const IOS_STORE_URL = "https://apps.apple.com/app/id6818631055";

const POLICY_TIMEOUT_MS = 3000;

export type AppUpdateDecision = { kind: "none" } | { kind: "store"; url: string };

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("timeout"));
      },
    );
  });
}

/** True when `current` is older than `minimum` (numeric dot-separated versions). */
function isVersionLower(current: string, minimum: string): boolean {
  const parse = (version: string) =>
    version.split(".").map((part) => {
      const value = Number.parseInt(part, 10);
      return Number.isFinite(value) ? value : 0;
    });

  const currentParts = parse(current);
  const minimumParts = parse(minimum);
  const length = Math.max(currentParts.length, minimumParts.length);

  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;
    if (currentPart < minimumPart) return true;
    if (currentPart > minimumPart) return false;
  }

  return false;
}

function storeListingUrl(): string {
  return Platform.OS === "ios" ? IOS_STORE_URL : ANDROID_STORE_URL;
}

function installedVersion(): string | null {
  const version = Constants.nativeAppVersion ?? Constants.expoConfig?.version;
  return typeof version === "string" && version.trim() ? version.trim() : null;
}

async function fetchMinimumStoreVersion(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const query = supabase
      .from("app_update_policy")
      .select("min_store_version")
      .eq("id", 1)
      .maybeSingle();

    const { data, error } = await withTimeout(query, POLICY_TIMEOUT_MS);
    if (error || !data) return null;

    const value = (data as { min_store_version?: unknown }).min_store_version;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

/** Send this install to the store when it is older than the published minimum. */
export async function inspectAppUpdate(): Promise<AppUpdateDecision> {
  if (__DEV__) return { kind: "none" };

  const minimum = await fetchMinimumStoreVersion();
  const current = installedVersion();
  if (minimum && current && isVersionLower(current, minimum)) {
    return { kind: "store", url: storeListingUrl() };
  }

  return { kind: "none" };
}
