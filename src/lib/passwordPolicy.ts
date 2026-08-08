/**
 * Password Policy
 *
 * Shared by signup, password reset, and profile so rules cannot drift.
 */

export const PASSWORD_HINT =
  "At least 8 characters, with upper and lower case letters and a number.";

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 72) return "Password must be 72 characters or fewer.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Password must include both uppercase and lowercase letters.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  return null;
}
