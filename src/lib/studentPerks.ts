import { toErrorMessage } from "@/lib/supabase";

export interface StudentPerkRow {
  id: string;
  provider_name: string;
  logo_url: string | null;
  category: string | null;
  summary: string;
  eligibility: string | null;
  claim_steps: string | null;
  official_url: string;
  availability: string | null;
  last_verified_on: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface StudentPerk {
  id: string;
  providerName: string;
  logoUrl: string | null;
  category: string | null;
  summary: string;
  eligibility: string | null;
  claimSteps: string[];
  officialUrl: string;
  availability: string | null;
  lastVerifiedOn: string | null;
  isActive: boolean;
  sortOrder: number;
}

export const PERK_SELECT = `
  id,
  provider_name,
  logo_url,
  category,
  summary,
  eligibility,
  claim_steps,
  official_url,
  availability,
  last_verified_on,
  is_active,
  sort_order
`;

export const PERK_CATEGORIES = [
  "Software",
  "AI",
  "Design",
  "Cloud",
  "Learning",
  "Other",
] as const;

export function mapStudentPerk(row: StudentPerkRow): StudentPerk {
  return {
    id: row.id,
    providerName: row.provider_name,
    logoUrl: row.logo_url,
    category: row.category,
    summary: row.summary,
    eligibility: row.eligibility,
    claimSteps: (row.claim_steps ?? "")
      .split("\n")
      .map((step) => step.trim())
      .filter(Boolean),
    officialUrl: row.official_url,
    availability: row.availability,
    lastVerifiedOn: row.last_verified_on,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function perkDisclaimer(providerName: string): string {
  return `Not affiliated with ${providerName}. Terms set by the provider.`;
}

export function formatVerifiedOn(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function filterPerks(perks: readonly StudentPerk[], query: string): StudentPerk[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...perks];
  return perks.filter((perk) =>
    [perk.providerName, perk.category, perk.summary, perk.eligibility, perk.availability]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(needle)),
  );
}

export function perksSchemaMissing(error: unknown): boolean {
  const message = toErrorMessage(error, "");
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /student_perks|does not exist|could not find the table/i.test(message)
  );
}

export function officialHttpsUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
