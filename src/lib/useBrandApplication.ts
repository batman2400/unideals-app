/**
 * Student brand application. The row stays pending until an admin approves
 * it, and the applicant stays a student until that approval promotes them.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase, toErrorMessage } from "@/lib/supabase";
import { REQUEST_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";

export type BrandApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export interface BrandApplication {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  logoUrl: string | null;
  location: string | null;
  contactName: string | null;
  contactPhone: string | null;
  status: BrandApplicationStatus;
  rejectionReason: string | null;
}

export interface BrandApplicationInput {
  name: string;
  contactName: string;
  contactPhone: string;
  category: string;
  description: string;
  websiteUrl: string;
  instagramHandle: string;
  tiktokHandle: string;
  location: string;
  logoUrl: string | null;
}

interface BrandApplicationRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  logo_url: string | null;
  location: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: BrandApplicationStatus;
  rejection_reason: string | null;
}

const APPLICATION_SELECT = `
  id,
  name,
  category,
  description,
  website_url,
  instagram_handle,
  tiktok_handle,
  logo_url,
  location,
  contact_name,
  contact_phone,
  status,
  rejection_reason
`;

export function applicationsSchemaMissing(error: unknown): boolean {
  const message = toErrorMessage(error, "");
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";
  return (
    code === "42703" ||
    code === "PGRST202" ||
    code === "42883" ||
    /applicant_user_id|submit_brand_application|does not exist|could not find the function/i.test(
      message,
    )
  );
}

function mapApplication(row: BrandApplicationRow): BrandApplication {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    websiteUrl: row.website_url,
    instagramHandle: row.instagram_handle,
    tiktokHandle: row.tiktok_handle,
    logoUrl: row.logo_url,
    location: row.location,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    status: row.status,
    rejectionReason: row.rejection_reason,
  };
}

export function applicationSubtitle(
  application: BrandApplication | null,
  isLoading: boolean,
): string {
  if (isLoading) return "Checking your application";
  if (!application) return "Apply to list offers on Uni Deals";
  if (application.status === "pending") {
    return "In review. You stay a student until it's approved.";
  }
  if (application.status === "rejected") {
    return application.rejectionReason
      ? `Declined: ${application.rejectionReason}`
      : "Declined. You can update and resubmit.";
  }
  if (application.status === "suspended") {
    return "This brand is suspended. Contact support.";
  }
  return "Approved. Open this to refresh your partner access.";
}

export function validateBrandApplication(
  input: BrandApplicationInput,
): string | null {
  if (!input.name.trim() || input.name.trim().length > 80) {
    return "Enter a brand name of 80 characters or fewer.";
  }
  if (!input.contactName.trim()) return "Enter a contact name.";
  const phone = input.contactPhone.trim();
  if (phone.length < 7 || phone.length > 30) {
    return "Enter a contact phone number.";
  }
  if (
    !input.websiteUrl.trim() &&
    !input.instagramHandle.trim() &&
    !input.tiktokHandle.trim()
  ) {
    return "Add a website or a social link so we can confirm the brand.";
  }
  if (input.description.trim().length > 1000) {
    return "Description is too long.";
  }
  return null;
}

function withWebsiteScheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function submitBrandApplication(
  input: BrandApplicationInput,
): Promise<void> {
  const validationError = validateBrandApplication(input);
  if (validationError) throw new Error(validationError);

  const { error } = await supabase.rpc("submit_brand_application", {
    p_name: input.name.trim(),
    p_contact_name: input.contactName.trim(),
    p_contact_phone: input.contactPhone.trim(),
    p_category: input.category.trim() || null,
    p_description: input.description.trim() || null,
    p_website_url: withWebsiteScheme(input.websiteUrl) || null,
    p_instagram_handle: input.instagramHandle.trim() || null,
    p_tiktok_handle: input.tiktokHandle.trim() || null,
    p_location: input.location.trim() || null,
    p_logo_url: input.logoUrl,
  });

  if (error) {
    if (applicationsSchemaMissing(error)) {
      throw new Error(
        "Brand applications are not live yet. The database update still needs to be applied.",
      );
    }
    throw new Error(toErrorMessage(error, "Couldn't submit your application."));
  }
}

export interface UseBrandApplicationResult {
  application: BrandApplication | null;
  isLoading: boolean;
  unavailable: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBrandApplication(
  userId: string | null | undefined,
): UseBrandApplicationResult {
  const [application, setApplication] = useState<BrandApplication | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);
  const requestIdRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    if (!userId) {
      setApplication(null);
      setUnavailable(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // limit(1) returns an empty list when this account has no application.
      // maybeSingle asks PostgREST for one object and can stall the screen.
      const { data, error: fetchError } = await withTimeout(
        supabase
          .from("brands")
          .select(APPLICATION_SELECT)
          .eq("applicant_user_id", userId)
          .limit(1),
        REQUEST_TIMEOUT_MS,
        "Checking your application is taking too long. You can still fill in the form.",
      );

      if (!activeRef.current || requestId !== requestIdRef.current) return;

      if (fetchError) {
        if (applicationsSchemaMissing(fetchError)) {
          setApplication(null);
          setUnavailable(true);
          setError(null);
        } else {
          setUnavailable(false);
          setError(
            toErrorMessage(fetchError, "Couldn't load your brand application."),
          );
        }
        return;
      }

      const rows = (
        Array.isArray(data) ? data : data ? [data] : []
      ) as BrandApplicationRow[];
      setUnavailable(false);
      setApplication(rows[0] ? mapApplication(rows[0]) : null);
    } catch (caught) {
      if (!activeRef.current || requestId !== requestIdRef.current) return;
      setUnavailable(false);
      setError(
        toErrorMessage(caught, "Couldn't load your brand application."),
      );
    } finally {
      if (activeRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    activeRef.current = true;
    void load();
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  return {
    application,
    isLoading,
    unavailable,
    error,
    refresh: load,
  };
}
