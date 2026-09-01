/**
 * Brand hub URLs — same slug rules as the website (`src/lib/seo.js`).
 */

export function slugify(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function brandHubPath(name: string): `/brand/${string}` {
  return `/brand/${slugify(name)}`;
}

export type BrandExploreTarget =
  | { kind: "directory"; query?: string }
  | { kind: "hub"; slug: string };

/**
 * Home “explore brands” search: empty → directory, unique match → hub,
 * otherwise a filtered directory.
 */
export function resolveBrandExplore(
  query: string,
  brandNames: string[],
): BrandExploreTarget {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) return { kind: "directory" };

  const names = [...new Set(brandNames.filter(Boolean))];
  const needle = trimmed.toLowerCase();
  const exact = names.find((name) => name.toLowerCase() === needle);
  if (exact) return { kind: "hub", slug: slugify(exact) };

  const startsWith = names.filter((name) =>
    name.toLowerCase().startsWith(needle),
  );
  if (startsWith.length === 1) {
    return { kind: "hub", slug: slugify(startsWith[0]) };
  }

  const contains = names.filter((name) => name.toLowerCase().includes(needle));
  if (contains.length === 1) {
    return { kind: "hub", slug: slugify(contains[0]) };
  }

  return { kind: "directory", query: trimmed };
}
