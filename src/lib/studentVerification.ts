/**
 * Student verification is valid for one year from the last approval.
 * Matches `interval '1 year'` in `supabase_yearly_student_verification.sql`.
 */

export const STUDENT_VERIFICATION_YEARS = 1;
export const STUDENT_VERIFICATION_RENEWAL_LEAD_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function studentVerificationExpiresAt(
  verifiedAt: string | Date | null | undefined,
): Date | null {
  if (!verifiedAt) return null;
  const start =
    verifiedAt instanceof Date ? verifiedAt : new Date(verifiedAt);
  if (Number.isNaN(start.getTime())) return null;

  const expires = new Date(start.getTime());
  expires.setUTCFullYear(expires.getUTCFullYear() + STUDENT_VERIFICATION_YEARS);
  return expires;
}

export function isStudentVerificationCurrent(
  isVerifiedFlag: boolean,
  verifiedAt: string | Date | null | undefined,
  now = Date.now(),
): boolean {
  if (!isVerifiedFlag) return false;
  const expires = studentVerificationExpiresAt(verifiedAt);
  // Column missing (SQL not applied yet) — trust the flag.
  if (!expires) return true;
  return expires.getTime() > now;
}

export function isStudentVerificationExpired(
  verifiedAt: string | Date | null | undefined,
  now = Date.now(),
): boolean {
  const expires = studentVerificationExpiresAt(verifiedAt);
  return Boolean(expires && expires.getTime() <= now);
}

export function isStudentVerificationExpiringSoon(
  isVerifiedFlag: boolean,
  verifiedAt: string | Date | null | undefined,
  now = Date.now(),
): boolean {
  if (!isStudentVerificationCurrent(isVerifiedFlag, verifiedAt, now)) {
    return false;
  }
  const expires = studentVerificationExpiresAt(verifiedAt);
  if (!expires) return false;
  const leadMs = STUDENT_VERIFICATION_RENEWAL_LEAD_DAYS * MS_PER_DAY;
  return expires.getTime() - now <= leadMs;
}

export function formatVerificationExpiry(
  verifiedAt: string | Date | null | undefined,
): string | null {
  const expires = studentVerificationExpiresAt(verifiedAt);
  if (!expires) return null;
  return expires.toLocaleDateString(undefined, { dateStyle: "medium" });
}
