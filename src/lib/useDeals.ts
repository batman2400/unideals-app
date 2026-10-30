/**
 * useDeals / useDeal
 *
 * Port of the web app's `src/lib/useDeals.js`.
 * - List: `get_public_deals()` (never returns redemption_code).
 *   That RPC only returns approved deals that have not ended, so store
 *   builds match the website even when they do not filter locally.
 * - Ended offers are also dropped on the client via `is_expired`, because
 *   the RPC hides `end_time` when the partner turns off the end date.
 *   Partners/admins still see finished deals in their portals.
 * - Detail: `get_public_deal_by_id()` (partners/admins may still receive
 *   `redemption_code`; students should call `reveal_online_deal_code`)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isExpiredDeal } from "@/lib/eventTiming";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { REQUEST_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";
import { mapDeal, type Deal, type PublicDealRow } from "@/types/database";

const dealsById = new Map<number, Deal>();

/** Keeps list rows so a deal tap can open before the detail request returns. */
export function rememberDeals(deals: readonly Deal[]): void {
  for (const deal of deals) {
    if (Number.isFinite(deal.id)) dealsById.set(deal.id, deal);
  }
}

export function rememberedDeal(id: number): Deal | null {
  return dealsById.get(id) ?? null;
}

export interface UseDealsResult {
  deals: Deal[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDeals(options?: {
  includeExpired?: boolean;
}): UseDealsResult {
  const includeExpired = options?.includeExpired === true;
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(true);

  const load = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const { data, error: rpcError } = await withTimeout(
          supabase.rpc("get_public_deals"),
          REQUEST_TIMEOUT_MS,
          "Could not load deals. Check your connection and try again.",
        );

        if (!activeRef.current) return;

        if (rpcError) {
          setError(toErrorMessage(rpcError, "Could not load deals."));
        } else {
          const rows = (data ?? []) as PublicDealRow[];
          const mapped = rows.map(mapDeal);
          rememberDeals(mapped);
          setDeals(
            includeExpired
              ? mapped
              : mapped.filter((deal) => !isExpiredDeal(deal)),
          );
        }
      } catch (caught) {
        if (!activeRef.current) return;
        setError(toErrorMessage(caught, "Could not load deals."));
      } finally {
        if (activeRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [includeExpired],
  );

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

/**
 * Saved-screen catalog: keeps ended offers that `useDeals()` would drop, and
 * fills gaps with `get_public_deal_by_id` when the list RPC omits them.
 */
export function useSavedDealCatalog(savedIds: Set<number>): UseDealsResult {
  const publicList = useDeals({ includeExpired: true });
  const [extraDeals, setExtraDeals] = useState<Deal[]>([]);
  const [extraError, setExtraError] = useState<string | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);

  const extraNonceRef = useRef(0);
  const [extraNonce, setExtraNonce] = useState(0);

  const savedIdList = useMemo(
    () =>
      [...savedIds]
        .filter((id) => Number.isFinite(id))
        .sort((a, b) => a - b),
    [savedIds],
  );

  const publicById = useMemo(() => {
    const map = new Map<number, Deal>();
    for (const deal of publicList.deals) {
      map.set(deal.id, deal);
    }
    return map;
  }, [publicList.deals]);

  const missingKey = useMemo(
    () => savedIdList.filter((id) => !publicById.has(id)).join(","),
    [savedIdList, publicById],
  );

  useEffect(() => {
    if (publicList.isLoading) return;

    if (!missingKey) {
      setExtraDeals([]);
      setExtraError(null);
      setExtraLoading(false);
      return;
    }

    const ids = missingKey.split(",").map(Number);
    let cancelled = false;
    setExtraLoading(true);

    void (async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const { data, error: rpcError } = await withTimeout(
              supabase.rpc("get_public_deal_by_id", { target_deal_id: id }),
              REQUEST_TIMEOUT_MS,
              "Could not load deals. Check your connection and try again.",
            );
            if (rpcError) {
              return { deal: null as Deal | null, failed: true };
            }
            const row = (Array.isArray(data) ? data[0] : data) as
              | PublicDealRow
              | null
              | undefined;
            return { deal: row ? mapDeal(row) : null, failed: false };
          } catch {
            return { deal: null as Deal | null, failed: true };
          }
        }),
      );

      if (cancelled) return;

      const found: Deal[] = [];
      let failed = false;
      for (const result of results) {
        if (result.deal) found.push(result.deal);
        else if (result.failed) failed = true;
      }

      rememberDeals(found);
      setExtraDeals(found);
      setExtraError(
        failed ? "Some saved deals could not be loaded." : null,
      );
      setExtraLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [missingKey, publicList.isLoading, extraNonce]);

  const deals = useMemo(() => {
    const extrasById = new Map(extraDeals.map((deal) => [deal.id, deal]));
    return savedIdList
      .map((id) => publicById.get(id) ?? extrasById.get(id) ?? null)
      .filter((deal): deal is Deal => deal != null)
      .sort((a, b) => {
        const endedDelta = Number(isExpiredDeal(a)) - Number(isExpiredDeal(b));
        if (endedDelta !== 0) return endedDelta;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [savedIdList, publicById, extraDeals]);

  return {
    deals,
    isLoading: publicList.isLoading || extraLoading,
    isRefreshing: publicList.isRefreshing,
    error: publicList.error ?? extraError,
    refresh: async () => {
      await publicList.refresh();
      extraNonceRef.current += 1;
      setExtraNonce(extraNonceRef.current);
    },
  };
}

export interface UseDealResult {
  deal: Deal | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * `accessKey` should change when auth/role/verification changes so the detail
 * RPC re-runs after verification. Student promo codes come from
 * `reveal_online_deal_code`, not this fetch.
 */
export function useDeal(
  id: string | number | undefined,
  accessKey = "",
): UseDealResult {
  const parsedOnMount = Number(id);
  const cachedOnMount = Number.isFinite(parsedOnMount)
    ? rememberedDeal(parsedOnMount)
    : null;
  const [deal, setDeal] = useState<Deal | null>(cachedOnMount);
  const [isLoading, setIsLoading] = useState(cachedOnMount == null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const activeRef = useRef(true);

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    const parsedId = Number(id);
    if (!Number.isFinite(parsedId)) {
      setDeal(null);
      setError("Invalid deal id.");
      setIsLoading(false);
      return;
    }

    const cached = rememberedDeal(parsedId);
    if (cached) {
      setDeal(cached);
      setError(null);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const { data, error: rpcError } = await withTimeout(
        supabase.rpc("get_public_deal_by_id", { target_deal_id: parsedId }),
        REQUEST_TIMEOUT_MS,
        "Opening this deal is taking too long. Check your connection and try again.",
      );

      if (!activeRef.current || requestId !== requestIdRef.current) return;

      if (rpcError) {
        if (!rememberedDeal(parsedId)) {
          setError(toErrorMessage(rpcError, "Could not load this deal."));
          setDeal(null);
        }
        return;
      }

      const row = (Array.isArray(data) ? data[0] : data) as
        | PublicDealRow
        | null
        | undefined;
      const next = row ? mapDeal(row) : null;
      if (next) rememberDeals([next]);
      setDeal(next);
      setError(next ? null : "This deal may have expired or been removed.");
    } catch (caught) {
      if (!activeRef.current || requestId !== requestIdRef.current) return;
      if (!rememberedDeal(parsedId)) {
        setDeal(null);
        setError(toErrorMessage(caught, "Could not load this deal."));
      }
    } finally {
      if (activeRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
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
    [
      deal.title,
      deal.brand,
      deal.category,
      deal.locationName,
      deal.locationAddress,
    ].some((field) =>
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
