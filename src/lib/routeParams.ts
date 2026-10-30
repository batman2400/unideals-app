import type { Href } from "expo-router";

/**
 * Expo Router can pass dynamic segments as `string | string[]`.
 * Always collapse to a single id before Number() / RPC lookups.
 */

/** Opens `app/deal/[id]` with the id param the detail screen reads. */
export function dealPath(id: number | string): Href {
  return {
    pathname: "/deal/[id]",
    params: { id: String(id) },
  };
}

/** Opens `app/event/[id]` with the id param the detail screen reads. */
export function eventPath(id: number | string): Href {
  return {
    pathname: "/event/[id]",
    params: { id: String(id) },
  };
}

/** Opens `app/perk/[id]` with the id param the detail screen reads. */
export function perkPath(id: number | string): Href {
  return {
    pathname: "/perk/[id]",
    params: { id: String(id) },
  } as unknown as Href;
}
export function asRouteId(param: string | string[] | undefined): string {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export type ScheduleParam = "live" | "coming_soon";

/** Home "View all" deep-links pass `?schedule=coming_soon` (or `live`). */
export function asScheduleParam(
  param: string | string[] | undefined,
): ScheduleParam | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === "live" || value === "coming_soon") return value;
  if (value === "current") return "live";
  return null;
}

export type QrPayloadKind = "ticket" | "student";

/**
 * `unideals://ticket/…` and `unideals://student/…` are QR payloads, not pages.
 * Detect them from a pathname, unmatched route, or full deep-link URL.
 */
export function qrPayloadKind(
  pathOrUrl: string | null | undefined,
): QrPayloadKind | null {
  if (!pathOrUrl) return null;

  const value = pathOrUrl.trim().toLowerCase();
  const path = value.includes("://")
    ? value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    : value.replace(/^\//, "");

  if (path.startsWith("ticket/") || path === "ticket") {
    return "ticket";
  }
  if (path.startsWith("student/") || path === "student") {
    return "student";
  }
  return null;
}
