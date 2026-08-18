export const BRAND_CATEGORIES = [
  "Food & Beverage",
  "Fashion & Apparel",
  "Tech & Electronics",
  "Entertainment",
  "Health & Beauty",
  "Travel",
  "Other",
] as const;

export type BrandCategory = (typeof BRAND_CATEGORIES)[number];
export type BrandCategoryValue = BrandCategory | "";

export const BRAND_CATEGORY_OPTIONS: readonly {
  value: BrandCategoryValue;
  label: string;
}[] = [
  { value: "", label: "Select category" },
  ...BRAND_CATEGORIES.map((value) => ({ value, label: value })),
];

export function categoryOptionsFor(
  current: string | null | undefined,
): readonly { value: string; label: string }[] {
  if (!current || BRAND_CATEGORIES.includes(current as BrandCategory)) {
    return BRAND_CATEGORY_OPTIONS;
  }
  return [...BRAND_CATEGORY_OPTIONS, { value: current, label: current }];
}

export function validateBrandProfile(input: { name: string }): string | null {
  if (!input.name.trim()) return "Brand name is required.";
  return null;
}

export function isDuplicateBrandName(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  ) {
    return true;
  }
  if (error instanceof Error && /duplicate key/i.test(error.message)) {
    return true;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return /duplicate key/i.test((error as { message: string }).message);
  }
  return false;
}
