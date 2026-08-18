/**
 * Port of the web app's `src/lib/dealOffer.js` plus redemption-code helpers
 * used by Create Deal / Edit Deal.
 */
import type { DealOfferType, DealType } from "@/types/database";
import { OFFICIAL_DEAL_CATEGORIES } from "@/types/database";

export type DealCategory = (typeof OFFICIAL_DEAL_CATEGORIES)[number];

export const DEAL_CATEGORY_OPTIONS: readonly {
  value: DealCategory;
  label: string;
}[] = OFFICIAL_DEAL_CATEGORIES.map((value) => ({ value, label: value }));

export const DEAL_TYPE_OPTIONS: readonly { value: DealType; label: string }[] = [
  { value: "Online", label: "Online" },
  { value: "In-Store", label: "In-Store" },
];

export const OFFER_TYPE_OPTIONS: readonly {
  value: DealOfferType;
  label: string;
}[] = [
  { value: "percentage_off", label: "Percentage Off" },
  { value: "flat_amount_off", label: "Flat Amount Off" },
  { value: "bogo", label: "Buy One Get One" },
  { value: "free_trial", label: "Free Trial / Free Period" },
  { value: "free_item", label: "Free Item / Service" },
  { value: "custom", label: "Custom Offer" },
];

/** Excludes characters that are easily confused when read off a screen. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function isOfferValueRequired(offerType: DealOfferType): boolean {
  return offerType !== "bogo";
}

/** Returns an error message when the offer value is missing or out of range. */
export function validateOfferValue(
  offerType: DealOfferType,
  offerValue: string,
): string | null {
  if (!isOfferValueRequired(offerType)) return null;

  const trimmed = String(offerValue ?? "").trim();
  if (!trimmed) {
    return `${getOfferValueLabel(offerType)} is required.`;
  }

  if (offerType === "percentage_off") {
    const percent = Number(trimmed.replace(/%/g, ""));
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return "Percent value must be a number between 1 and 100.";
    }
  }

  if (offerType === "flat_amount_off") {
    const amount = Number(trimmed.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Amount value must be a positive number.";
    }
  }

  return null;
}

export function isoToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function validateSchedule(
  start: Date | null,
  end: Date | null,
  options: { startRequired?: boolean } = {},
): string | null {
  if (options.startRequired && !start) {
    return "Start date and time are required.";
  }
  if (start && end && end.getTime() < start.getTime()) {
    return "End must be on or after the start date.";
  }
  if (!start && end && end.getTime() < Date.now()) {
    return "End must be in the future when no start date is set.";
  }
  return null;
}

export function getOfferValueLabel(offerType: DealOfferType): string {
  switch (offerType) {
    case "percentage_off":
      return "Percent Value";
    case "flat_amount_off":
      return "Amount Value";
    case "free_trial":
      return "Free Period";
    case "free_item":
      return "Free Item / Service";
    case "custom":
      return "Custom Offer Text";
    default:
      return "Offer Value";
  }
}

export function getOfferValuePlaceholder(offerType: DealOfferType): string {
  switch (offerType) {
    case "percentage_off":
      return "Enter percent, e.g. 10";
    case "flat_amount_off":
      return "Enter amount, e.g. $15";
    case "free_trial":
      return "Enter period, e.g. 1 Month";
    case "free_item":
      return "Enter item or service";
    case "custom":
      return "Describe your offer";
    default:
      return "Enter offer value";
  }
}

export function buildOfferLabel(
  offerType: DealOfferType,
  offerValue: string,
): string {
  const normalized = String(offerValue ?? "").trim();

  switch (offerType) {
    case "percentage_off": {
      const numberOnly = normalized.replace(/%/g, "");
      return numberOnly ? `${numberOnly}% OFF` : "";
    }
    case "flat_amount_off":
      return normalized ? `${normalized} OFF` : "";
    case "bogo":
      return "BUY 1 GET 1";
    case "free_trial":
      return normalized ? `FREE ${normalized}` : "";
    case "free_item":
      return normalized ? `FREE ${normalized}` : "";
    case "custom":
      return normalized;
    default:
      return normalized;
  }
}

export function parseOfferLabel(offerLabel: string): {
  offerType: DealOfferType;
  offerValue: string;
} {
  const normalized = String(offerLabel ?? "").trim();

  if (!normalized) {
    return { offerType: "percentage_off", offerValue: "" };
  }

  const percentageMatch = /^(\d+(?:\.\d+)?)\s*%\s*OFF$/i.exec(normalized);
  if (percentageMatch?.[1]) {
    return { offerType: "percentage_off", offerValue: percentageMatch[1] };
  }

  if (/^buy\s*1\s*get\s*1$/i.test(normalized) || /^bogo$/i.test(normalized)) {
    return { offerType: "bogo", offerValue: "" };
  }

  const freeMatch = /^FREE\s+(.+)$/i.exec(normalized);
  if (freeMatch?.[1]) {
    const freeValue = freeMatch[1].trim();
    const likelyTrial = /(month|week|day|trial|subscription|pass)/i.test(
      freeValue,
    );
    return {
      offerType: likelyTrial ? "free_trial" : "free_item",
      offerValue: freeValue,
    };
  }

  const flatMatch = /^(.+?)\s+OFF$/i.exec(normalized);
  if (flatMatch?.[1]) {
    return {
      offerType: "flat_amount_off",
      offerValue: flatMatch[1].trim(),
    };
  }

  return { offerType: "custom", offerValue: normalized };
}

export function generateRedemptionCode(): string {
  const body = Array.from({ length: 10 }, () => {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    return CODE_ALPHABET[index];
  }).join("");
  return `UD-${body}`;
}

/** Parse `YYYY-MM-DD` + `HH:MM` into a local Date, or null if invalid. */
export function parseDateTime(
  datePart: string,
  timePart: string,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timePart.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const next = new Date(year, month, day, hour, minute, 0, 0);
  return Number.isNaN(next.getTime()) ? null : next;
}

/** Split an ISO timestamp into local `YYYY-MM-DD` / `HH:MM` fields. */
export function splitDateTime(iso: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!iso) return { date: "", time: "" };
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return { date: "", time: "" };

  const yyyy = String(value.getFullYear());
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  const hh = String(value.getHours()).padStart(2, "0");
  const min = String(value.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}
