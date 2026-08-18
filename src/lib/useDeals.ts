/**
 * useDeals / useDeal
 *
 * Port of the web app's `src/lib/useDeals.js`.
 * - List: `get_public_deals()` (never returns redemption_code)
 * - Ended offers are dropped from student lists; partners/admins see them
 *   under Finished in their portals.
 * - Detail: `get_public_deal_by_id()` (code only when caller may see it)
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { isExpiredDeal } from "@/lib/eventTiming";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { mapDeal, type Deal, type PublicDealRow } from "@/types/database";

export interface UseDealsResult {
  deals: Deal[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDeals(): UseDealsResult {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(true);

  const load = useCallback(async (isRefresh: boolean): Promise<void> => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("get_public_deals");

    if (!activeRef.current) return;

    if (rpcError) {
      setError(toErrorMessage(rpcError, "Could not load deals."));
    } else {
      const rows = (data ?? []) as PublicDealRow[];
      setDeals(rows.map(mapDeal).filter((deal) => !isExpiredDeal(deal)));
    }

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

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { deals, isLoading, isRefreshing, error, refresh };
}

export interface UseDealResult {
  deal: Deal | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * `accessKey` should change when auth/role/verification changes so the detail
 * RPC re-runs and can surface `redemption_code` after verification.
 */
export function useDeal(
  id: string | number | undefined,
  accessKey = "",
): UseDealResult {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const parsedId = Number(id);
    if (!Number.isFinite(parsedId)) {
      setDeal(null);
      setError("Invalid deal id.");
      setIsLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(
      "get_public_deal_by_id",
      { target_deal_id: parsedId },
    );

    if (!activeRef.current) return;

    if (rpcError) {
      setError(toErrorMessage(rpcError, "Could not load this deal."));
      setDeal(null);
    } else {
      const row = (Array.isArray(data) ? data[0] : data) as
        | PublicDealRow
        | null
        | undefined;
      setDeal(row ? mapDeal(row) : null);
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    activeRef.current = true;
    void load();

    return () => {
      activeRef.current = false;
    };
  }, [load, accessKey]);

  return { deal, isLoading, error, refresh: load };
}

/** Case-insensitive match across the fields the web Perks page searches. */
export function filterDeals(deals: Deal[], query: string): Deal[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return deals;

  return deals.filter((deal) =>
    [deal.title, deal.brand, deal.category].some((field) =>
      field?.toLowerCase().includes(normalized),
    ),
  );
}

export type DealBrandSummary = {
  name: string;
  dealCount: number;
  imageUrl: string | null;
};

/** Unique brand names from the public deal list, with deal counts. */
export function uniqueDealBrands(deals: Deal[]): DealBrandSummary[] {
  const map = new Map<string, DealBrandSummary>();
  for (const deal of deals) {
    const name = deal.brand?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.dealCount += 1;
      if (!existing.imageUrl && deal.imageUrl) existing.imageUrl = deal.imageUrl;
    } else {
      map.set(key, {
        name,
        dealCount: 1,
        imageUrl: deal.imageUrl,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterDealBrands(
  brands: DealBrandSummary[],
  query: string,
): DealBrandSummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return brands;
  return brands.filter((brand) => brand.name.toLowerCase().includes(normalized));
}
