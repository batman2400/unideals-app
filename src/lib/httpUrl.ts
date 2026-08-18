/**
 * Only http(s) URLs are safe to open from deal/event CTAs.
 * Values without a scheme are treated as https.
 */
export function asHttpUrl(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "#") return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}
