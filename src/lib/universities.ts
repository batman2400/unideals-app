/** Canonical Sri Lankan universities / institutes for the verification list. */
export interface UniversityOption {
  name: string;
  domains: string[];
}

export interface UniversityDomainRow {
  domain?: string | null;
  institution_name?: string | null;
}

const NAME_ALIASES: Record<string, string> = {
  "sri lanka institute of information technology":
    "Sri Lanka Institute of Information Technology (SLIIT)",
  "national institute of business management":
    "National Institute of Business Management (NIBM)",
  "informatics institute of technology":
    "Informatics Institute of Technology (IIT)",
  "asia pacific institute of information technology":
    "Asia Pacific Institute of Information Technology (APIIT)",
  kiu: "KIU (Kaatsu International University)",
  "kaatsu international university": "KIU (Kaatsu International University)",
  "kaatsu international (private) university":
    "KIU (Kaatsu International University)",
  "australian college of business and technology":
    "Australian College of Business and Technology (ACBT)",
  "universal college lanka": "Universal College Lanka (UCL)",
  "edith cowan university sri lanka":
    "Edith Cowan University Sri Lanka (ECU)",
  "edith cowan university": "Edith Cowan University Sri Lanka (ECU)",
  "british college of applied studies":
    "British College of Applied Studies (BCAS)",
  "management and science institute":
    "Management and Science Institute (MSI)",
  "curtin colombo": "Curtin University Colombo",
  "curtin university": "Curtin University Colombo",
  "anc campus": "ANC Education",
  "american education centre": "ANC Education",
  "american education centre limited": "ANC Education",
};

export const SRI_LANKA_UNIVERSITIES: readonly UniversityOption[] = [
  { name: "University of Colombo", domains: ["cmb.ac.lk"] },
  { name: "University of Peradeniya", domains: ["pdn.ac.lk"] },
  { name: "University of Sri Jayewardenepura", domains: ["sjp.ac.lk"] },
  { name: "University of Kelaniya", domains: ["kln.ac.lk"] },
  { name: "University of Moratuwa", domains: ["uom.lk", "mrt.ac.lk"] },
  { name: "University of Jaffna", domains: ["jfn.ac.lk"] },
  { name: "University of Ruhuna", domains: ["ruh.ac.lk"] },
  { name: "The Open University of Sri Lanka", domains: ["ou.ac.lk"] },
  { name: "Eastern University, Sri Lanka", domains: ["esn.ac.lk"] },
  { name: "South Eastern University of Sri Lanka", domains: ["seu.ac.lk"] },
  { name: "Rajarata University of Sri Lanka", domains: ["rjt.ac.lk"] },
  { name: "Sabaragamuwa University of Sri Lanka", domains: ["sab.ac.lk"] },
  { name: "Wayamba University of Sri Lanka", domains: ["wyb.ac.lk"] },
  { name: "Uva Wellassa University", domains: ["uwu.ac.lk"] },
  { name: "University of the Visual and Performing Arts", domains: ["vpa.ac.lk"] },
  { name: "Gampaha Wickramarachchi University of Indigenous Medicine", domains: ["gwu.ac.lk"] },
  { name: "University of Vavuniya", domains: ["vau.ac.lk"] },
  {
    name: "General Sir John Kotelawala Defence University",
    domains: ["kdu.ac.lk"],
  },
  { name: "University of Vocational Technology", domains: ["uovt.ac.lk"] },
  { name: "Ocean University of Sri Lanka", domains: ["ocu.ac.lk"] },
  { name: "Buddhist and Pali University of Sri Lanka", domains: ["bpu.ac.lk"] },
  { name: "Bhiksu University of Sri Lanka", domains: ["busl.ac.lk"] },
  { name: "NSBM Green University", domains: ["nsbm.lk", "nsbm.ac.lk"] },
  {
    name: "Sri Lanka Institute of Information Technology (SLIIT)",
    domains: ["sliit.lk", "sliit.ac.lk"],
  },
  { name: "Informatics Institute of Technology (IIT)", domains: ["iit.lk"] },
  {
    name: "Asia Pacific Institute of Information Technology (APIIT)",
    domains: ["apiit.lk"],
  },
  {
    name: "National Institute of Business Management (NIBM)",
    domains: ["nibm.lk"],
  },
  { name: "CINEC Campus", domains: ["cinec.edu", "cinec.lk"] },
  {
    name: "KIU (Kaatsu International University)",
    domains: ["kiu.ac.lk", "kiu.lk"],
  },
  { name: "ESOFT Metro Campus", domains: ["esoft.lk"] },
  { name: "ICBT Campus", domains: ["icbt.lk"] },
  { name: "ANC Education", domains: ["ancedu.com"] },
  {
    name: "Australian College of Business and Technology (ACBT)",
    domains: ["acbt.lk"],
  },
  { name: "Universal College Lanka (UCL)", domains: ["ucl.lk"] },
  {
    name: "Edith Cowan University Sri Lanka (ECU)",
    domains: ["our.ecu.edu.au", "ecu.edu.lk"],
  },
  { name: "Horizon Campus", domains: ["horizoncampus.edu.lk"] },
  {
    name: "British College of Applied Studies (BCAS)",
    domains: ["bcas.lk"],
  },
  { name: "Saegis Campus", domains: ["saegis.ac.lk"] },
  {
    name: "Curtin University Colombo",
    domains: ["student.curtin.edu.au", "curtincolombo.lk"],
  },
  {
    name: "Management and Science Institute (MSI)",
    domains: ["msi.edu.lk"],
  },
  { name: "Royal Institute of Colombo", domains: ["ric.lk"] },
  { name: "BMS", domains: ["bms.lk"] },
  { name: "CA Sri Lanka", domains: ["casrilanka.com"] },
];

export function emailHost(email: string | null | undefined): string {
  const normalized = String(email ?? "").trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 0) return "";
  return normalized.slice(at + 1);
}

export function hostMatchesDomain(
  host: string | null | undefined,
  domain: string | null | undefined,
): boolean {
  const h = String(host ?? "").trim().toLowerCase();
  const d = String(domain ?? "").trim().toLowerCase();
  if (!h || !d) return false;
  return h === d || h.endsWith(`.${d}`);
}

export function mergeUniversityOptions(
  dbRows?: readonly UniversityDomainRow[] | null,
): UniversityOption[] {
  const map = new Map<string, { name: string; domains: Set<string> }>();

  function add(name: string | null | undefined, domain: string | null | undefined) {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) return;
    const alias = NAME_ALIASES[trimmed.toLowerCase()];
    const key = alias?.toLowerCase() ?? trimmed.toLowerCase();
    const display = alias ?? trimmed;
    if (!map.has(key)) {
      map.set(key, { name: display, domains: new Set() });
    }
    const host = String(domain ?? "").trim().toLowerCase();
    if (host) map.get(key)?.domains.add(host);
  }

  for (const uni of SRI_LANKA_UNIVERSITIES) {
    if (!uni.domains.length) {
      add(uni.name, "");
      continue;
    }
    for (const domain of uni.domains) add(uni.name, domain);
  }

  for (const row of dbRows ?? []) {
    add(row.institution_name, row.domain);
  }

  return [...map.values()]
    .map((uni) => ({ name: uni.name, domains: [...uni.domains] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findUniversityByEmail(
  email: string,
  options: readonly UniversityOption[] | null | undefined,
): UniversityOption | null {
  const host = emailHost(email);
  if (!host) return null;
  return (
    (options ?? []).find((uni) =>
      (uni.domains ?? []).some((domain) => hostMatchesDomain(host, domain)),
    ) ?? null
  );
}

export function emailMatchesUniversity(
  email: string,
  university: UniversityOption | null | undefined,
): boolean {
  if (!university) return false;
  const domains = university.domains ?? [];
  if (domains.length === 0) return true;
  const host = emailHost(email);
  return domains.some((domain) => hostMatchesDomain(host, domain));
}

const STOP_WORDS = new Set(["of", "the", "and", "for", "at", "a", "an"]);
const DOMAIN_NOISE = new Set(["lk", "ac", "edu", "com", "www"]);

/** Misspellings and short forms that are not already in the name or domain. */
const SEARCH_ALIASES: Record<string, readonly string[]> = {
  "university of sri jayewardenepura": [
    "japura",
    "sjp",
    "usj",
    "usjp",
    "jayawardenepura",
    "jayawardena",
  ],
  "university of moratuwa": ["mora", "uom"],
  "university of colombo": ["uoc"],
  "university of peradeniya": ["pera", "uop"],
  "university of kelaniya": ["kelani"],
  "university of jaffna": ["uoj"],
  "university of ruhuna": ["ruh"],
  "the open university of sri lanka": ["ousl"],
  "general sir john kotelawala defence university": [
    "kdu",
    "kotelawala",
    "defense",
  ],
  "eastern university sri lanka": ["eusl"],
  "south eastern university of sri lanka": ["seusl"],
  "rajarata university of sri lanka": ["rajarata"],
  "sabaragamuwa university of sri lanka": ["susl"],
  "wayamba university of sri lanka": ["wayamba"],
  "uva wellassa university": ["wellassa"],
  "university of the visual and performing arts": ["uvpa"],
  "gampaha wickramarachchi university of indigenous medicine": [
    "wickramarachchi",
  ],
  "buddhist and pali university of sri lanka": ["bpu"],
  "ca sri lanka": ["casl", "casrilanka"],
  "kiu kaatsu international university": ["kaatsu"],
  "curtin university colombo": ["curtin"],
  "edith cowan university sri lanka ecu": ["ecu", "edith"],
  "horizon campus": ["horizon"],
  "saegis campus": ["saegis"],
  "management and science institute msi": ["msi", "msu"],
};

export function foldUniversityText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function significantWords(name: string): string[] {
  return foldUniversityText(name)
    .split(" ")
    .filter((word) => word && !STOP_WORDS.has(word));
}

function parenToken(name: string): string {
  const match = name.match(/\(([^)]+)\)/);
  if (!match?.[1]) return "";
  return match[1].toLowerCase().replace(/[^a-z0-9]/g, "");
}

interface UniversitySearchContext {
  name: string;
  words: string[];
  paren: string;
  domains: string[];
  labels: string[];
  aliases: string[];
}

function searchContext(uni: UniversityOption): UniversitySearchContext {
  const name = foldUniversityText(uni.name);
  const domains = (uni.domains ?? [])
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  return {
    name,
    words: significantWords(uni.name),
    paren: parenToken(uni.name),
    domains,
    labels: domains.map((domain) => domain.split(".")[0] ?? "").filter(Boolean),
    aliases: [...(SEARCH_ALIASES[name] ?? [])],
  };
}

function startsWithToken(value: string, token: string): boolean {
  return value === token || value.startsWith(token);
}

function tokenMatches(token: string, ctx: UniversitySearchContext): boolean {
  if (token.length <= 2) {
    return (
      ctx.words.some(
        (word) =>
          word === token ||
          (word.startsWith(token) && word.length <= token.length + 2),
      ) ||
      ctx.paren === token ||
      ctx.paren.startsWith(token) ||
      ctx.labels.some((label) => label === token || label.startsWith(token)) ||
      ctx.aliases.some((alias) => alias === token || alias.startsWith(token))
    );
  }

  return (
    ctx.words.some((word) => startsWithToken(word, token)) ||
    ctx.paren === token ||
    ctx.paren.startsWith(token) ||
    ctx.labels.some((label) => startsWithToken(label, token)) ||
    ctx.domains.some((domain) => domain.startsWith(token)) ||
    ctx.aliases.some(
      (alias) => alias === token || alias.startsWith(token) || alias.includes(token),
    )
  );
}

function scoreUniversity(
  ctx: UniversitySearchContext,
  foldedQuery: string,
  compact: string,
  tokens: readonly string[],
): number {
  let score = 0;
  if (ctx.name === foldedQuery) score += 300;
  else if (ctx.name.startsWith(foldedQuery)) score += 80;

  if (ctx.paren && ctx.paren === compact) score += 240;
  else if (ctx.paren && compact.length >= 2 && ctx.paren.startsWith(compact)) {
    score += 120;
  }

  if (ctx.labels.some((label) => label === compact)) score += 200;
  else if (
    compact.length >= 2 &&
    ctx.labels.some((label) => label.startsWith(compact))
  ) {
    score += 90;
  }

  if (ctx.aliases.some((alias) => alias === compact || alias === foldedQuery)) {
    score += 180;
  }

  for (const token of tokens) {
    if (ctx.words.some((word) => word === token)) score += 40;
    else if (ctx.words.some((word) => word.startsWith(token))) score += 26;
    if (ctx.domains.some((domain) => domain.startsWith(token))) score += 14;
    if (ctx.aliases.some((alias) => alias.includes(token))) score += 18;
  }

  score += Math.max(0, 6 - ctx.words.length);
  return score;
}

/** Ranked university search: name, short form (SLIIT), domain, and common aliases. */
export function searchUniversities(
  options: readonly UniversityOption[],
  query: string,
): UniversityOption[] {
  const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name));
  const foldedQuery = foldUniversityText(query);
  if (!foldedQuery) return sorted;

  const rawTokens = foldedQuery.split(" ").filter(Boolean);
  if (rawTokens.every((token) => STOP_WORDS.has(token))) return sorted;

  const tokens = rawTokens.filter(
    (token) => !STOP_WORDS.has(token) && !DOMAIN_NOISE.has(token),
  );
  if (!tokens.length) return [];
  const compact = foldedQuery.replace(/ /g, "");

  return sorted
    .map((uni) => {
      const ctx = searchContext(uni);
      if (!tokens.every((token) => tokenMatches(token, ctx))) return null;
      return { uni, score: scoreUniversity(ctx, foldedQuery, compact, tokens) };
    })
    .filter(
      (row): row is { uni: UniversityOption; score: number } => row != null,
    )
    .sort(
      (a, b) => b.score - a.score || a.uni.name.localeCompare(b.uni.name),
    )
    .map((row) => row.uni);
}

