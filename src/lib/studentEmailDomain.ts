export const UNIVERSAL_STUDENT_EMAIL_SUFFIXES = [
  ".ac.lk",
  ".edu.lk",
  ".sliit.lk",
  ".edu",
  ".edu.au",
  ".ac.uk",
] as const;

export function isAllowedStudentEmail(
  email: string,
  allowedDomains: readonly string[],
): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;

  if (
    UNIVERSAL_STUDENT_EMAIL_SUFFIXES.some((suffix) =>
      normalized.endsWith(suffix),
    )
  ) {
    return true;
  }

  const domainPart = normalized.split("@")[1] ?? "";
  return allowedDomains.some((allowed) => {
    const host = allowed.trim().toLowerCase();
    return domainPart === host || domainPart.endsWith(`.${host}`);
  });
}
