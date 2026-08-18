/**
 * usePartnerDeals
 *
 * Lists deals owned by a partner (`deals.brand_id` or `deals.partner_id`)
 * so legacy rows without a brand_id still appear. Client-side lifecycle
 * bucketing (active / scheduled / expired) matches the web portal.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase, toErrorMessage } from "@/lib/supabase";
import type { DealType, PartnerDeal, PartnerDealRow } from "@/types/database";
import { mapPartnerDeal } from "@/types/database";

export type PartnerDealLifecycle =
  | "active"
  | "scheduled"
  | "expired"
  | "pending"
  | "rejected"
  | "other";

export interface PartnerDealMetrics {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
  pending: number;
  rejected: number;
}

export interface UsePartnerDealsResult {
  deals: PartnerDeal[];
  metrics: PartnerDealMetrics;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteDeal: (dealId: number) => Promise<string | null>;
}

const PARTNER_DEAL_COLUMNS =
  "id, title, brand, discount, type, category, image_url, status, redemption_code, created_at, start_time, end_time";

export function getPartnerDealLifecycle(
  deal: Pick<PartnerDeal, "status" | "startTime" | "endTime">,
  now = new Date(),
): PartnerDealLifecycle {
  if (deal.status === "pending") return "pending";
  if (deal.status === "rejected") return "rejected";

  const start = deal.startTime ? new Date(deal.startTime) : new Date(0);
  const end = deal.endTime ? new Date(deal.endTime) : null;

  if (deal.status === "expired" || (end && end < now)) {
    return "expired";
  }

  if (deal.status === "active" || deal.status === "approved") {
    if (start > now) return "scheduled";
    return "active";
  }

  return "other";
}

export function computePartnerDealMetrics(
  deals: readonly PartnerDeal[],
  now = new Date(),
): PartnerDealMetrics {
  let active = 0;
  let scheduled = 0;
  let expired = 0;
  let pending = 0;
  let rejected = 0;

  for (const deal of deals) {
    const lifecycle = getPartnerDealLifecycle(deal, now);
    if (lifecycle === "active") active += 1;
    else if (lifecycle === "scheduled") scheduled += 1;
    else if (lifecycle === "expired") expired += 1;
    else if (lifecycle === "pending") pending += 1;
    else if (lifecycle === "rejected") rejected += 1;
  }

  return { total: deals.length, active, scheduled, expired, pending, rejected };
}

export function usePartnerDeals(
  brandId: string | null | undefined,
  partnerId?: string | null,
): UsePartnerDealsResult {
  const [deals, setDeals] = useState<PartnerDeal[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(brandId || partnerId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      if (!brandId && !partnerId) {
        setDeals([]);
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      let query = supabase.from("deals").select(PARTNER_DEAL_COLUMNS);

      if (brandId && partnerId) {
        query = query.or(`brand_id.eq.${brandId},partner_id.eq.${partnerId}`);
      } else if (brandId) {
        query = query.eq("brand_id", brandId);
      } else if (partnerId) {
        query = query.eq("partner_id", partnerId);
      }

      const { data, error: queryError } = await query.order("created_at", {
        ascending: false,
      });

      if (!activeRef.current) return;

      if (queryError) {
        setError(toErrorMessage(queryError, "Could not load your deals."));
        setDeals([]);
      } else {
        const rows = (data ?? []) as PartnerDealRow[];
        setDeals(
          rows.map((row) =>
            mapPartnerDeal({
              ...row,
              type: row.type as DealType,
            }),
          ),
        );
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [brandId, partnerId],
  );

  useEffect(() => {
    activeRef.current = true;
    void load(false);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const deleteDeal = useCallback(
    async (dealId: number): Promise<string | null> => {
      if (!brandId && !partnerId) return "No brand assigned.";

      let deleteQuery = supabase.from("deals").delete().eq("id", dealId);

      if (brandId && partnerId) {
        deleteQuery = deleteQuery.or(
          `brand_id.eq.${brandId},partner_id.eq.${partnerId}`,
        );
      } else if (brandId) {
        deleteQuery = deleteQuery.eq("brand_id", brandId);
      } else if (partnerId) {
        deleteQuery = deleteQuery.eq("partner_id", partnerId);
      }

      const { data, error: deleteError } = await deleteQuery.select("id");

      if (deleteError) {
        return toErrorMessage(deleteError, "Could not delete deal.");
      }

      if (!data || data.length === 0) {
        return "Delete blocked. You can only delete your own brand deals.";
      }

      setDeals((previous) => previous.filter((deal) => deal.id !== dealId));
      return null;
    },
    [brandId, partnerId],
  );

  const metrics = useMemo(() => computePartnerDealMetrics(deals), [deals]);

  return {
    deals,
    metrics,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    deleteDeal,
  };
}
