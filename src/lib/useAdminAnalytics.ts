/**
 * useAdminAnalytics — shop + deal performance + recent valid scans.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase, toErrorMessage } from "@/lib/supabase";
import type {
  AdminDeal,
  AdminDealRow,
  AdminRecentScan,
  AdminRecentScanRow,
} from "@/types/database";
import { mapAdminDeal, mapAdminRecentScan } from "@/types/database";

export interface ShopAnalyticsRow {
  brand: string;
  total_scans: number | string | null;
  valid_scans: number | string | null;
  failed_scans: number | string | null;
  confirmed_redemptions: number | string | null;
}

export interface ShopAnalytics {
  brand: string;
  totalScans: number;
  validScans: number;
  failedScans: number;
  confirmedRedemptions: number;
}

function mapShop(row: ShopAnalyticsRow): ShopAnalytics {
  return {
    brand: row.brand,
    totalScans: Number(row.total_scans ?? 0),
    validScans: Number(row.valid_scans ?? 0),
    failedScans: Number(row.failed_scans ?? 0),
    confirmedRedemptions: Number(row.confirmed_redemptions ?? 0),
  };
}

export interface AnalyticsTotals {
  reveals: number;
  tickets: number;
  scans: number;
  validScans: number;
  failedScans: number;
  confirmed: number;
}

export interface UseAdminAnalyticsResult {
  shopStats: ShopAnalytics[];
  dealStats: AdminDeal[];
  recentScans: AdminRecentScan[];
  brandOptions: string[];
  selectedBrand: string;
  setSelectedBrand: (brand: string) => void;
  totals: AnalyticsTotals;
  filteredDeals: AdminDeal[];
  filteredShops: ShopAnalytics[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_TOTALS: AnalyticsTotals = {
  reveals: 0,
  tickets: 0,
  scans: 0,
  validScans: 0,
  failedScans: 0,
  confirmed: 0,
};

export function useAdminAnalytics(): UseAdminAnalyticsResult {
  const [shopStats, setShopStats] = useState<ShopAnalytics[]>([]);
  const [dealStats, setDealStats] = useState<AdminDeal[]>([]);
  const [recentScans, setRecentScans] = useState<AdminRecentScan[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("All Brands");
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

    const [shopRes, dealsRes] = await Promise.all([
      supabase.rpc("get_redemption_analytics_by_shop"),
      supabase.rpc("admin_list_all_deals", {
        status_filter: null,
        search_query: "",
        page_limit: 1000,
        page_offset: 0,
      }),
    ]);

    if (!activeRef.current) return;

    if (shopRes.error || dealsRes.error) {
      setError(
        "Analytics data unavailable. Ensure SQL migrations are applied.",
      );
      setShopStats([]);
      setDealStats([]);
    } else {
      setShopStats(((shopRes.data ?? []) as ShopAnalyticsRow[]).map(mapShop));
      setDealStats(((dealsRes.data ?? []) as AdminDealRow[]).map(mapAdminDeal));
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  const loadScans = useCallback(async (): Promise<void> => {
    let query = supabase
      .from("redemption_events")
      .select(
        "id, brand, scanned_code, scan_result, scan_method, created_at, deals(title)",
      )
      .eq("scan_result", "valid")
      .order("created_at", { ascending: false })
      .limit(20);

    if (selectedBrand !== "All Brands") {
      query = query.eq("brand", selectedBrand);
    }

    const scansRes = await query;
    if (!activeRef.current) return;

    if (scansRes.error) {
      setRecentScans([]);
    } else {
      setRecentScans(
        ((scansRes.data ?? []) as AdminRecentScanRow[]).map(mapAdminRecentScan),
      );
    }
  }, [selectedBrand]);

  useEffect(() => {
    activeRef.current = true;
    void load(false);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    void loadScans();
  }, [loadScans]);

  const brandOptions = useMemo(
    () => [
      "All Brands",
      ...Array.from(
        new Set(shopStats.map((s) => s.brand).filter(Boolean)),
      ).sort(),
    ],
    [shopStats],
  );

  const isGlobal = selectedBrand === "All Brands";

  const filteredDeals = useMemo(
    () =>
      isGlobal
        ? dealStats
        : dealStats.filter((d) => d.brand === selectedBrand),
    [dealStats, isGlobal, selectedBrand],
  );

  const filteredShops = useMemo(
    () =>
      isGlobal
        ? shopStats
        : shopStats.filter((s) => s.brand === selectedBrand),
    [shopStats, isGlobal, selectedBrand],
  );

  const totals = useMemo(() => {
    return {
      reveals: filteredDeals.reduce((sum, d) => sum + d.totalReveals, 0),
      tickets: filteredDeals.reduce(
        (sum, d) => sum + d.totalTicketsGenerated,
        0,
      ),
      scans: filteredShops.reduce((sum, s) => sum + s.totalScans, 0),
      validScans: filteredShops.reduce((sum, s) => sum + s.validScans, 0),
      failedScans: filteredShops.reduce((sum, s) => sum + s.failedScans, 0),
      confirmed: filteredShops.reduce(
        (sum, s) => sum + s.confirmedRedemptions,
        0,
      ),
    };
  }, [filteredDeals, filteredShops]);

  return {
    shopStats,
    dealStats,
    recentScans,
    brandOptions,
    selectedBrand,
    setSelectedBrand,
    totals: totals ?? EMPTY_TOTALS,
    filteredDeals,
    filteredShops,
    isLoading,
    isRefreshing,
    error,
    refresh: async () => {
      await load(true);
      await loadScans();
    },
  };
}
