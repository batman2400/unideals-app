import {
  SRI_LANKA_UNIVERSITIES,
  emailHost,
  hostMatchesDomain,
} from "@/lib/universities";

export const UNIVERSAL_STUDENT_EMAIL_SUFFIXES = [
  ".ac.lk",
  ".edu.lk",
  ".sliit.lk",
  ".edu",
  ".edu.au",
  ".ac.uk",
] as const;

/** Host after the last @, lowercased. */
export function emailDomain(email: string): string {
  return emailHost(email);
}

/**
 * Match an email host against a suffix or apex domain.
 * `.sliit.lk` matches both `name@sliit.lk` and `name@mail.sliit.lk`.
 */
export function hostMatchesSuffix(host: string, suffix: string): boolean {
  let normalized = String(suffix ?? "").trim().toLowerCase();
  if (normalized.startsWith(".")) normalized = normalized.slice(1);
  return hostMatchesDomain(host, normalized);
}

function catalogDomains(): string[] {
  return SRI_LANKA_UNIVERSITIES.flatMap((uni) => uni.domains);
}

export function isAllowedStudentEmail(
  email: string,
  allowedDomains: readonly string[],
): boolean {
  const host = emailDomain(email);
  if (!host) return false;

  if (
    UNIVERSAL_STUDENT_EMAIL_SUFFIXES.some((suffix) =>
      hostMatchesSuffix(host, suffix),
    )
  ) {
    return true;
  }

  const extras = [...allowedDomains, ...catalogDomains()];
  return extras.some((allowed) => hostMatchesSuffix(host, allowed));
}
