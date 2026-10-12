/**
 * Admin queue for new brand applications and held name/logo changes.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { applicationsSchemaMissing } from "@/lib/useBrandApplication";
import { supabase, toErrorMessage } from "@/lib/supabase";

export type BrandReviewKind = "application" | "profile";

export interface BrandReviewItem {
  id: string;
  kind: BrandReviewKind;
  name: string;
  pendingName: string | null;
  logoUrl: string | null;
  pendingLogoUrl: string | null;
  category: string | null;
  description: string | null;
  contactName: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  location: string | null;
  submittedAt: string | null;
}

interface ReviewRow {
  id: string;
  name: string;
  status: string;
  profile_review_status: string;
  pending_name: string | null;
  pending_logo_url: string | null;
  logo_url: string | null;
  category: string | null;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  location: string | null;
  submitted_at: string | null;
  updated_at: string | null;
}

const REVIEW_SELECT = `
  id,
  name,
  status,
  profile_review_status,
  pending_name,
  pending_logo_url,
  logo_url,
  category,
  description,
  contact_name,
  contact_phone,
  website_url,
  instagram_handle,
  tiktok_handle,
  location,
  submitted_at,
  updated_at
`;

function toItems(row: ReviewRow): BrandReviewItem[] {
  const shared = {
    id: row.id,
    name: row.name,
    pendingName: row.pending_name,
    logoUrl: row.logo_url,
    pendingLogoUrl: row.pending_logo_url,
    category: row.category,
    description: row.description,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    websiteUrl: row.website_url,
    instagramHandle: row.instagram_handle,
    tiktokHandle: row.tiktok_handle,
    location: row.location,
    submittedAt: row.submitted_at ?? row.updated_at,
  };
  const items: BrandReviewItem[] = [];
  if (row.status === "pending") {
    items.push({ ...shared, kind: "application" });
  }
  if (row.profile_review_status === "pending") {
    items.push({ ...shared, kind: "profile" });
  }
  return items;
}

export interface UseAdminBrandApplicationsResult {
  items: BrandReviewItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  unavailable: boolean;
  error: string | null;
  actingKey: string | null;
  refresh: () => Promise<void>;
  approve: (item: BrandReviewItem) => Promise<string | null>;
  reject: (item: BrandReviewItem, reason: string) => Promise<string | null>;
}

export function useAdminBrandApplications(): UseAdminBrandApplicationsResult {
  const [items, setItems] = useState<BrandReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(async (isRefresh: boolean): Promise<void> => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("brands")
      .select(REVIEW_SELECT)
      .or("status.eq.pending,profile_review_status.eq.pending")
      .order("submitted_at", { ascending: false });

    if (!activeRef.current) return;

    if (fetchError) {
      if (applicationsSchemaMissing(fetchError)) {
        setItems([]);
        setUnavailable(true);
        setError(null);
      } else {
        setUnavailable(false);
        setError(
          toErrorMessage(fetchError, "Couldn't load brand applications."),
        );
      }
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const rows = (data ?? []) as ReviewRow[];
    setUnavailable(false);
    setItems(rows.flatMap(toItems));
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void load(false);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const review = useCallback(
    async (
      item: BrandReviewItem,
      decision: "approve" | "reject",
      reason = "",
    ): Promise<string | null> => {
      const key = `${item.kind}:${item.id}`;
      setActingKey(key);
      setError(null);

      const functionName =
        item.kind === "application"
          ? decision === "approve"
            ? "approve_brand_application"
            : "reject_brand_application"
          : decision === "approve"
            ? "approve_brand_profile_change"
            : "reject_brand_profile_change";

      const args =
        decision === "approve"
          ? { p_brand_id: item.id }
          : { p_brand_id: item.id, p_reason: reason.trim() || null };

      const { error: reviewError } = await supabase.rpc(functionName, args);
      if (!activeRef.current) return null;

      if (reviewError) {
        const message = toErrorMessage(
          reviewError,
          "Couldn't update that review.",
        );
        setError(message);
        setActingKey(null);
        return message;
      }

      setActingKey(null);
      await load(true);
      return null;
    },
    [load],
  );

  return {
    items,
    isLoading,
    isRefreshing,
    unavailable,
    error,
    actingKey,
    refresh: () => load(true),
    approve: (item) => review(item, "approve"),
    reject: (item, reason) => review(item, "reject", reason),
  };
}
