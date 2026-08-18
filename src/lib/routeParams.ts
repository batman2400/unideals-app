/**
 * Expo Router can pass dynamic segments as `string | string[]`.
 * Always collapse to a single id before Number() / RPC lookups.
 */
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
