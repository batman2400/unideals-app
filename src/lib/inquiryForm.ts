export const SUPPORT_EMAIL = "unideals.lk@gmail.com";

export type InquiryType = "general" | "partner" | "event" | "support";

export const INQUIRY_TYPE_OPTIONS: readonly {
  value: InquiryType;
  label: string;
}[] = [
  { value: "general", label: "General Question" },
  { value: "partner", label: "Partner / Brand Application" },
  { value: "event", label: "Event Collaboration" },
  { value: "support", label: "Report an Issue / Support" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseInquiryType(raw: unknown): InquiryType {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === "general" ||
    value === "partner" ||
    value === "event" ||
    value === "support"
  ) {
    return value;
  }
  return "general";
}

export function needsBrandName(type: InquiryType): boolean {
  return type === "partner" || type === "event";
}

export function validateInquiry(input: {
  name: string;
  email: string;
  inquiryType: InquiryType;
  brandName: string;
  message: string;
}): string | null {
  if (!input.name.trim()) return "Full name is required.";
  if (!input.email.trim()) return "Email address is required.";
  if (!EMAIL_PATTERN.test(input.email.trim())) {
    return "Enter a valid email address.";
  }
  if (needsBrandName(input.inquiryType) && !input.brandName.trim()) {
    return "Brand / organization name is required.";
  }
  if (!input.message.trim()) return "Please write a message.";
  return null;
}
