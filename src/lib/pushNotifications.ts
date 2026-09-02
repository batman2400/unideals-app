/**
 * Expo push tokens for student deal/event alerts.
 *
 * Tokens live in `public.push_tokens` (see supabase_push_notifications.sql).
 * Sending is a Supabase Edge Function, not this module.
 *
 * Native modules (`expo-notifications`, `expo-device`) are loaded lazily so
 * Expo Go and older development APKs can still boot. Push is a no-op there.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

const TOKEN_CACHE_KEY = "unideals.push-token";
export const PUSH_CHANNEL_ID = "deals-events";

export interface PushTarget {
  type: "deal" | "event";
  id: string;
}

type NotificationsModule = typeof import("expo-notifications");

interface NotificationResponseLike {
  notification: {
    request: {
      content: {
        data?: unknown;
      };
    };
  };
}

let didConsumeInitialResponse = false;
let notificationsModule: NotificationsModule | null | undefined;

function easProjectId(): string | null {
  const fromEas = Constants.easConfig?.projectId;
  if (typeof fromEas === "string" && fromEas.length > 0) return fromEas;
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromExtra === "string" && fromExtra.length > 0) return fromExtra;
  return null;
}

function canUsePush(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

function nativePushAvailable(): boolean {
  return requireOptionalNativeModule("ExpoPushTokenManager") != null;
}

function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  if (!canUsePush() || !nativePushAvailable()) {
    notificationsModule = null;
    return null;
  }

  try {
    const Notifications = require("expo-notifications") as NotificationsModule;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationsModule = Notifications;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    console.warn("[push] Native notifications unavailable:", message);
    notificationsModule = null;
  }

  return notificationsModule;
}

async function readCachedToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_CACHE_KEY);
  } catch {
    return null;
  }
}

async function writeCachedToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_CACHE_KEY, token);
  } catch {
    // Cache is an optimization.
  }
}

async function clearCachedToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_CACHE_KEY);
  } catch {
    // Ignore.
  }
}

async function ensureAndroidChannel(
  Notifications: NotificationsModule,
): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
    name: "Deals and events",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function permissionsGranted(
  Notifications: NotificationsModule,
): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/**
 * Ask for permission (students only) and upsert this device token.
 * No-ops on web, simulators, older APKs, and when permission is denied.
 */
export async function registerStudentPushToken(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const allowed = await permissionsGranted(Notifications);
    if (!allowed) return;

    await ensureAndroidChannel(Notifications);

    const projectId = easProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    if (!token) return;

    const platform = Platform.OS === "ios" ? "ios" : "android";
    const { error } = await supabase.rpc("upsert_own_push_token", {
      p_token: token,
      p_platform: platform,
    });
    if (error) {
      console.warn("[push] Could not save push token:", error.message);
      return;
    }
    await writeCachedToken(token);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    console.warn("[push] Token registration skipped:", message);
  }
}

/**
 * Remove this device token so a signed-out or non-student account stops
 * receiving student alerts. Must run while a session is still valid.
 */
export async function unregisterDevicePushToken(): Promise<void> {
  if (!canUsePush()) return;

  const token = await readCachedToken();
  if (!token) return;

  try {
    const { error } = await supabase.rpc("unregister_push_token", {
      p_token: token,
    });
    if (error) {
      console.warn("[push] Could not remove push token:", error.message);
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    console.warn("[push] Token unregister skipped:", message);
  } finally {
    await clearCachedToken();
  }
}

export function targetFromPushData(
  data: Record<string, unknown> | null | undefined,
): PushTarget | null {
  if (!data) return null;
  const type = data.type;
  const rawId = data.id;
  const id =
    typeof rawId === "number"
      ? String(rawId)
      : typeof rawId === "string"
        ? rawId
        : "";
  if (!id) return null;
  if (type === "deal" || type === "event") {
    return { type, id };
  }
  return null;
}

function targetFromResponse(
  response: NotificationResponseLike | null,
): PushTarget | null {
  if (!response) return null;
  const data = response.notification.request.content.data;
  if (!data || typeof data !== "object") return null;
  return targetFromPushData(data as Record<string, unknown>);
}

/** Cold-start tap. Safe to call once after auth is ready. */
export function consumeInitialPushTarget(): PushTarget | null {
  if (didConsumeInitialResponse || !canUsePush()) return null;
  didConsumeInitialResponse = true;
  const Notifications = getNotifications();
  if (!Notifications) return null;
  try {
    const target = targetFromResponse(Notifications.getLastNotificationResponse());
    Notifications.clearLastNotificationResponse();
    return target;
  } catch {
    return null;
  }
}

export function subscribeToPushResponses(
  onTarget: (target: PushTarget) => void,
): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const target = targetFromResponse(response);
      if (target) onTarget(target);
    },
  );

  return () => subscription.remove();
}

export function subscribeToPushTokenRefresh(): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => {};

  const subscription = Notifications.addPushTokenListener(() => {
    void registerStudentPushToken();
  });

  return () => subscription.remove();
}
