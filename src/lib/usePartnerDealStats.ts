/**
 * usePartnerDealStats
 *
 * Loads per-deal partner analytics via `get_partner_deal_stats`, with a
 * coarse fallback (scan / redemption totals only) if the RPC is unavailable.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase, toErrorMessage } from "@/lib/supabase";
import type { PartnerDealStats, PartnerDealStatsRow } from "@/types/database";
import { mapPartnerDealStats } from "@/types/database";

export interface PartnerAnalyticsTotals {
  totalReveals: number;
  totalCopies: number;
  totalClicks: number;
  totalTickets: number;
  totalScans: number;
  confirmedRedemptions: number;
}

export interface UsePartnerDealStatsResult {
  dealStats: PartnerDealStats[];
  totals: PartnerAnalyticsTotals;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  warning: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_TOTALS: PartnerAnalyticsTotals = {
  totalReveals: 0,
  totalCopies: 0,
  totalClicks: 0,
  totalTickets: 0,
  totalScans: 0,
  confirmedRedemptions: 0,
};

function sumTotals(rows: readonly PartnerDealStats[]): PartnerAnalyticsTotals {
  return rows.reduce(
    (acc, row) => ({
      totalReveals: acc.totalReveals + row.totalReveals,
      totalCopies: acc.totalCopies + row.totalCopies,
      totalClicks: acc.totalClicks + row.totalClickThroughs,
      totalTickets: acc.totalTickets + row.totalTicketsGenerated,
      totalScans: acc.totalScans + row.totalScans,
      confirmedRedemptions:
        acc.confirmedRedemptions + row.confirmedRedemptions,
    }),
    { ...EMPTY_TOTALS },
  );
}

async function loadFallbackTotals(
  partnerId: string,
): Promise<PartnerAnalyticsTotals> {
  const [scansRes, confirmedRes] = await Promise.all([
    supabase
      .from("redemption_events")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId),
    supabase
      .from("confirmed_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId),
  ]);

  if (scansRes.error) {
    throw scansRes.error;
  }
  if (confirmedRes.error) {
    throw confirmedRes.error;
  }

  return {
    ...EMPTY_TOTALS,
    totalScans: scansRes.count ?? 0,
    confirmedRedemptions: confirmedRes.count ?? 0,
  };
}

export function usePartnerDealStats(
  partnerId: string | null | undefined,
): UsePartnerDealStatsResult {
  const [dealStats, setDealStats] = useState<PartnerDealStats[]>([]);
  const [fallbackTotals, setFallbackTotals] =
    useState<PartnerAnalyticsTotals | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(partnerId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!partnerId) {
        setDealStats([]);
        setFallbackTotals(null);
        setError(null);
        setWarning(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (mode === "initial") setIsLoading(true);
      else setIsRefreshing(true);

      const { data, error: rpcError } = await supabase.rpc(
        "get_partner_deal_stats",
        { target_partner_id: partnerId },
      );

      if (!activeRef.current) return;

      if (rpcError) {
        try {
          const totals = await loadFallbackTotals(partnerId);
          if (!activeRef.current) return;
          setDealStats([]);
          setFallbackTotals(totals);
          setError(null);
          setWarning(
            "Per-deal analytics aren't available. Showing scan totals only.",
          );
        } catch (fallbackError) {
          if (!activeRef.current) return;
          setDealStats([]);
          setFallbackTotals(null);
          setWarning(null);
          setError(
            toErrorMessage(
              fallbackError,
              "Couldn't load your analytics. Check your connection and try again.",
            ),
          );
        } finally {
          if (activeRef.current) {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
        return;
      }

      const mapped = ((data as PartnerDealStatsRow[] | null) ?? []).map(
        mapPartnerDealStats,
      );
      setDealStats(mapped);
      setFallbackTotals(null);
      setError(null);
      setWarning(null);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [partnerId],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const refresh = useCallback(async () => {
    await load("refresh");
  }, [load]);

  const totals = useMemo(() => {
    if (fallbackTotals) return fallbackTotals;
    return sumTotals(dealStats);
  }, [dealStats, fallbackTotals]);

  return {
    dealStats,
    totals,
    isLoading,
    isRefreshing,
    error,
    warning,
    refresh,
  };
}
