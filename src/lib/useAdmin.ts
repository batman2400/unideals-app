/**
 * useAdmin
 *
 * Admin portal data helpers. Chunk 6 covers overview metrics + recent
 * valid scans (port of web `AdminOverview.jsx`). Later admin screens will
 * extend this module with list/moderation RPCs.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase, toErrorMessage } from "@/lib/supabase";
import { notifyVerificationRejected } from "@/lib/verificationDocuments";
import type {
  AdminDeal,
  AdminDealRow,
  AdminRecentScan,
  AdminRecentScanRow,
  AdminUser,
  AdminUserRow,
  CampusEvent,
  EventRow,
  ManualVerification,
  ManualVerificationRow,
} from "@/types/database";
import {
  getAdminDealLifecycle,
  mapAdminDeal,
  mapAdminRecentScan,
  mapAdminUser,
  mapEvent,
  mapManualVerification,
} from "@/types/database";

export interface AdminOverviewMetrics {
  totalDeals: number;
  activeDeals: number;
  totalUsers: number;
  totalPartners: number;
  pendingVerifications: number;
  confirmedRedemptions: number;
}

export interface UseAdminOverviewResult {
  metrics: AdminOverviewMetrics;
  recentScans: AdminRecentScan[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_METRICS: AdminOverviewMetrics = {
  totalDeals: 0,
  activeDeals: 0,
  totalUsers: 0,
  totalPartners: 0,
  pendingVerifications: 0,
  confirmedRedemptions: 0,
};

interface DealTimingRow {
  id: number;
  status: string;
  start_time: string | null;
  end_time: string | null;
}

interface UsersRpcRow {
  total_count?: number | string | null;
}

function countActiveDeals(
  deals: readonly DealTimingRow[],
  now = new Date(),
): number {
  let active = 0;
  for (const deal of deals) {
    const start = deal.start_time ? new Date(deal.start_time) : new Date(0);
    const end = deal.end_time ? new Date(deal.end_time) : null;
    if (deal.status !== "active" && deal.status !== "approved") continue;
    if (start > now) continue;
    if (end && end < now) continue;
    active += 1;
  }
  return active;
}

export function useAdminOverview(): UseAdminOverviewResult {
  const [metrics, setMetrics] = useState<AdminOverviewMetrics>(EMPTY_METRICS);
  const [recentScans, setRecentScans] = useState<AdminRecentScan[]>([]);
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

    const [
      dealsRes,
      usersRes,
      partnersRes,
      verificationsRes,
      confirmedRes,
      recentScansRes,
    ] = await Promise.all([
      supabase.from("deals").select("id, status, start_time, end_time"),
      supabase.rpc("list_users_with_roles", {
        search_query: "",
        role_filter: null,
        page_limit: 1,
        page_offset: 0,
      }),
      supabase.rpc("list_users_with_roles", {
        search_query: "",
        role_filter: "partner",
        page_limit: 1,
        page_offset: 0,
      }),
      supabase
        .from("manual_verifications")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "awaiting_confirmation"]),
      supabase
        .from("confirmed_redemptions")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("redemption_events")
        .select(
          "id, brand, scanned_code, scan_result, scan_method, created_at, deals(title)",
        )
        .eq("scan_result", "valid")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (!activeRef.current) return;

    const next: AdminOverviewMetrics = { ...EMPTY_METRICS };
    const failures: string[] = [];

    if (dealsRes.error) {
      failures.push(toErrorMessage(dealsRes.error, "Could not load deals."));
    } else {
      const deals = (dealsRes.data ?? []) as DealTimingRow[];
      next.totalDeals = deals.length;
      next.activeDeals = countActiveDeals(deals);
    }

    if (usersRes.error) {
      failures.push(toErrorMessage(usersRes.error, "Could not load users."));
    } else {
      const row = (usersRes.data as UsersRpcRow[] | null)?.[0];
      next.totalUsers = Number(row?.total_count ?? 0);
    }

    if (partnersRes.error) {
      failures.push(
        toErrorMessage(partnersRes.error, "Could not load partners."),
      );
    } else {
      const row = (partnersRes.data as UsersRpcRow[] | null)?.[0];
      next.totalPartners = Number(row?.total_count ?? 0);
    }

    if (verificationsRes.error) {
      failures.push(
        toErrorMessage(
          verificationsRes.error,
          "Could not load verifications.",
        ),
      );
    } else {
      next.pendingVerifications = verificationsRes.count ?? 0;
    }

    if (confirmedRes.error) {
      failures.push(
        toErrorMessage(confirmedRes.error, "Could not load redemptions."),
      );
    } else {
      next.confirmedRedemptions = confirmedRes.count ?? 0;
    }

    if (recentScansRes.error) {
      failures.push(
        toErrorMessage(recentScansRes.error, "Could not load recent scans."),
      );
      setRecentScans([]);
    } else {
      const rows = (recentScansRes.data ?? []) as AdminRecentScanRow[];
      setRecentScans(rows.map(mapAdminRecentScan));
    }

    setMetrics(next);
    setError(failures[0] ?? null);
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

  return {
    metrics,
    recentScans,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
  };
}

// ─── Verifications ───────────────────────────────────────────────────────────

const PROOF_BUCKET = "verification-documents";
const SIGNED_URL_TTL_SECONDS = 300;

/**
 * Rows created before the bucket was private may store a full public URL;
 * newer rows store the object path. Accept both.
 */
function toProofStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  const marker = `/${PROOF_BUCKET}/`;
  const index = value.indexOf(marker);
  return index >= 0 ? value.slice(index + marker.length) : value;
}

export type VerificationProofUrls = {
  front: string | null;
  back: string | null;
};

export interface UseAdminVerificationsResult {
  verifications: ManualVerification[];
  proofUrls: Record<string, VerificationProofUrls>;
  isLoading: boolean;
  isRefreshing: boolean;
  actingId: string | null;
  error: string | null;
  message: string | null;
  refresh: () => Promise<void>;
  approve: (id: string) => Promise<string | null>;
  reject: (id: string, reason: string) => Promise<string | null>;
}

async function signProofUrl(value: string | null | undefined): Promise<string | null> {
  const path = toProofStoragePath(value);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export function useAdminVerifications(): UseAdminVerificationsResult {
  const [verifications, setVerifications] = useState<ManualVerification[]>([]);
  const [proofUrls, setProofUrls] = useState<Record<string, VerificationProofUrls>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(async (isRefresh: boolean): Promise<void> => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("manual_verifications")
      .select("*")
      .in("status", ["pending", "awaiting_confirmation"])
      .order("created_at", { ascending: false });

    if (!activeRef.current) return;

    if (fetchError) {
      setError(
        toErrorMessage(fetchError, "Failed to load pending verifications."),
      );
      setVerifications([]);
      setProofUrls({});
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const rows = (data ?? []) as ManualVerificationRow[];
    const mapped = rows.map(mapManualVerification);
    setVerifications(mapped);

    const signed = await Promise.all(
      mapped.map(async (row) => {
        const [front, back] = await Promise.all([
          signProofUrl(row.proofImageUrl),
          signProofUrl(row.proofImageBackUrl),
        ]);
        return [row.id, { front, back }] as const;
      }),
    );

    if (!activeRef.current) return;
    setProofUrls(Object.fromEntries(signed));
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

  const approve = useCallback(async (id: string): Promise<string | null> => {
    setActingId(id);
    setError(null);
    const { error: rpcError } = await supabase.rpc(
      "approve_manual_verification",
      { request_id: id },
    );
    if (!activeRef.current) return null;
    setActingId(null);
    if (rpcError) {
      const msg = toErrorMessage(rpcError, "Failed to approve verification.");
      setError(msg);
      return msg;
    }
    setVerifications((prev) => prev.filter((v) => v.id !== id));
    setMessage("Student verification approved.");
    return null;
  }, []);

  const reject = useCallback(
    async (id: string, reason: string): Promise<string | null> => {
      setActingId(id);
      setError(null);
      const { error: rpcError } = await supabase.rpc(
        "reject_manual_verification",
        { request_id: id, reason },
      );
      if (!activeRef.current) return null;
      if (rpcError) {
        setActingId(null);
        const msg = toErrorMessage(rpcError, "Failed to reject verification.");
        setError(msg);
        return msg;
      }
      await notifyVerificationRejected(id);
      if (!activeRef.current) return null;
      setActingId(null);
      setVerifications((prev) => prev.filter((v) => v.id !== id));
      setMessage("Student verification rejected.");
      return null;
    },
    [],
  );

  return {
    verifications,
    proofUrls,
    isLoading,
    isRefreshing,
    actingId,
    error,
    message,
    refresh: () => load(true),
    approve,
    reject,
  };
}

// ─── All Deals ───────────────────────────────────────────────────────────────

export type AdminDealStatusFilter =
  | "all"
  | "pending"
  | "active"
  | "scheduled"
  | "expired"
  | "paused";

export const ADMIN_DEALS_PAGE_LIMIT = 500;

export interface UseAdminDealsResult {
  deals: AdminDeal[];
  totalCount: number;
  pageLimit: number;
  isLoading: boolean;
  isRefreshing: boolean;
  actingId: number | null;
  error: string | null;
  message: string | null;
  refresh: () => Promise<void>;
  setDealStatus: (dealId: number, status: string) => Promise<string | null>;
  deleteDeal: (dealId: number) => Promise<string | null>;
}

export function useAdminDeals(
  statusFilter: AdminDealStatusFilter,
  searchQuery: string,
): UseAdminDealsResult {
  const [deals, setDeals] = useState<AdminDeal[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const [listRes, timingRes] = await Promise.all([
        supabase.rpc("admin_list_all_deals", {
          status_filter: null,
          search_query: searchQuery,
          page_limit: ADMIN_DEALS_PAGE_LIMIT,
          page_offset: 0,
        }),
        supabase.from("deals").select("id, start_time, end_time, status"),
      ]);

      if (!activeRef.current) return;

      if (listRes.error) {
        setError(toErrorMessage(listRes.error, "Could not load deals."));
        setDeals([]);
        setTotalCount(0);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (timingRes.error) {
        setError(
          toErrorMessage(
            timingRes.error,
            "Couldn't load deal schedules, so status filters may be inaccurate.",
          ),
        );
      }

      const timingMap = new Map(
        ((timingRes.data ?? []) as {
          id: number;
          start_time: string | null;
          end_time: string | null;
          status: string;
        }[]).map((t) => [Number(t.id), t]),
      );

      const rows = (listRes.data ?? []) as AdminDealRow[];
      setTotalCount(Number(rows[0]?.total_count ?? rows.length));

      let processed = rows.map((row) => {
        const timing = timingMap.get(Number(row.id));
        return mapAdminDeal({
          ...row,
          start_time: timing?.start_time ?? null,
          end_time: timing?.end_time ?? null,
          db_status: timing?.status ?? row.status,
        });
      });

      if (statusFilter !== "all") {
        processed = processed.filter(
          (deal) => getAdminDealLifecycle(deal) === statusFilter,
        );
      }

      setDeals(processed);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [searchQuery, statusFilter],
  );

  useEffect(() => {
    activeRef.current = true;
    void load(false);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const setDealStatus = useCallback(
    async (dealId: number, status: string): Promise<string | null> => {
      setActingId(dealId);
      setError(null);
      const { error: updateError } = await supabase
        .from("deals")
        .update({ status })
        .eq("id", dealId);

      if (!activeRef.current) return null;
      setActingId(null);

      if (updateError) {
        const msg = toErrorMessage(updateError, "Could not update deal status.");
        setError(msg);
        return msg;
      }

      setDeals((prev) => {
        const next = prev.map((d) =>
          d.id === dealId ? { ...d, status, dbStatus: status } : d,
        );
        if (statusFilter === "all") return next;
        return next.filter(
          (deal) => getAdminDealLifecycle(deal) === statusFilter,
        );
      });
      setMessage(
        status === "approved"
          ? "Deal approved and visible to students when live."
          : `Deal status changed to ${status}.`,
      );
      return null;
    },
    [statusFilter],
  );

  const deleteDeal = useCallback(
    async (dealId: number): Promise<string | null> => {
      setActingId(dealId);
      setError(null);
      const { error: deleteError } = await supabase
        .from("deals")
        .delete()
        .eq("id", dealId);

      if (!activeRef.current) return null;
      setActingId(null);

      if (deleteError) {
        const msg = toErrorMessage(deleteError, "Could not delete deal.");
        setError(msg);
        return msg;
      }

      setDeals((prev) => prev.filter((d) => d.id !== dealId));
      setMessage("Deal deleted permanently.");
      return null;
    },
    [],
  );

  return {
    deals,
    totalCount,
    pageLimit: ADMIN_DEALS_PAGE_LIMIT,
    isLoading,
    isRefreshing,
    actingId,
    error,
    message,
    refresh: () => load(true),
    setDealStatus,
    deleteDeal,
  };
}

// ─── Users ───────────────────────────────────────────────────────────────────

export type AdminUserRoleFilter = "all" | "student" | "partner" | "admin";

export interface BrandOption {
  id: string;
  name: string;
}

export const ADMIN_USERS_PAGE_LIMIT = 100;

export interface UseAdminUsersResult {
  users: AdminUser[];
  totalCount: number;
  pageLimit: number;
  brands: BrandOption[];
  isLoading: boolean;
  isRefreshing: boolean;
  actingUserId: string | null;
  promoting: boolean;
  error: string | null;
  message: string | null;
  refresh: () => Promise<void>;
  promote: (email: string, brandId: string) => Promise<string | null>;
  demote: (userId: string, email: string) => Promise<string | null>;
}

export function useAdminUsers(
  roleFilter: AdminUserRoleFilter,
  searchQuery: string,
): UseAdminUsersResult {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activeRef = useRef(true);

  const loadUsers = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const { data, error: fetchError } = await supabase.rpc(
        "list_users_with_roles",
        {
          search_query: searchQuery,
          role_filter: roleFilter === "all" ? null : roleFilter,
          page_limit: ADMIN_USERS_PAGE_LIMIT,
          page_offset: 0,
        },
      );

      if (!activeRef.current) return;

      if (fetchError) {
        setError(toErrorMessage(fetchError, "Could not load users."));
        setUsers([]);
        setTotalCount(0);
      } else {
        const rows = (data ?? []) as AdminUserRow[];
        setTotalCount(Number(rows[0]?.total_count ?? rows.length));
        setUsers(rows.map(mapAdminUser));
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [roleFilter, searchQuery],
  );

  const loadBrands = useCallback(async (): Promise<void> => {
    const { data, error: brandsError } = await supabase
      .from("brands")
      .select("id, name")
      .order("name");

    if (!activeRef.current) return;

    if (brandsError) {
      setError(
        toErrorMessage(
          brandsError,
          "Couldn't load the brand list. Promotion is unavailable until this loads.",
        ),
      );
      return;
    }

    setBrands((data ?? []) as BrandOption[]);
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void loadUsers(false);
    void loadBrands();
    return () => {
      activeRef.current = false;
    };
  }, [loadUsers, loadBrands]);

  const promote = useCallback(
    async (email: string, brandId: string): Promise<string | null> => {
      setPromoting(true);
      setError(null);
      const { error: promoteError } = await supabase.rpc(
        "promote_user_to_partner",
        {
          target_email: email.trim(),
          target_brand_id: brandId,
        },
      );

      if (!activeRef.current) return null;
      setPromoting(false);

      if (promoteError) {
        const msg = toErrorMessage(promoteError, "Could not promote user.");
        setError(msg);
        return msg;
      }

      setMessage(`Promoted ${email.trim()} to partner.`);
      await loadUsers(true);
      return null;
    },
    [loadUsers],
  );

  const demote = useCallback(
    async (userId: string, email: string): Promise<string | null> => {
      setActingUserId(userId);
      setError(null);
      const { error: demoteError } = await supabase.rpc(
        "demote_user_to_student",
        { target_user_id: userId },
      );

      if (!activeRef.current) return null;
      setActingUserId(null);

      if (demoteError) {
        const msg = toErrorMessage(demoteError, "Could not demote user.");
        setError(msg);
        return msg;
      }

      setMessage(`${email} demoted to student.`);
      await loadUsers(true);
      return null;
    },
    [loadUsers],
  );

  return {
    users,
    totalCount,
    pageLimit: ADMIN_USERS_PAGE_LIMIT,
    brands,
    isLoading,
    isRefreshing,
    actingUserId,
    promoting,
    error,
    message,
    refresh: () => loadUsers(true),
    promote,
    demote,
  };
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface UseAdminEventsResult {
  events: CampusEvent[];
  isLoading: boolean;
  isRefreshing: boolean;
  actingId: string | null;
  error: string | null;
  message: string | null;
  refresh: () => Promise<void>;
  deleteEvent: (eventId: string) => Promise<string | null>;
}

export function useAdminEvents(searchQuery: string): UseAdminEventsResult {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      let query = supabase
        .from("events")
        .select("*")
        .order("start_time", { ascending: false });

      const trimmed = searchQuery.trim();
      if (trimmed) {
        query = query.or(
          `title.ilike.%${trimmed}%,category.ilike.%${trimmed}%,university_name.ilike.%${trimmed}%`,
        );
      }

      const { data, error: fetchError } = await query;

      if (!activeRef.current) return;

      if (fetchError) {
        setError(toErrorMessage(fetchError, "Could not load events."));
        setEvents([]);
      } else {
        setEvents(((data ?? []) as EventRow[]).map(mapEvent));
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [searchQuery],
  );

  useEffect(() => {
    activeRef.current = true;
    void load(false);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const deleteEvent = useCallback(
    async (eventId: string): Promise<string | null> => {
      setActingId(eventId);
      setError(null);
      const { error: deleteError } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (!activeRef.current) return null;
      setActingId(null);

      if (deleteError) {
        const msg = toErrorMessage(deleteError, "Could not delete event.");
        setError(msg);
        return msg;
      }

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setMessage("Event deleted permanently.");
      return null;
    },
    [],
  );

  return {
    events,
    isLoading,
    isRefreshing,
    actingId,
    error,
    message,
    refresh: () => load(true),
    deleteEvent,
  };
}

export interface UseAdminPendingEventsResult {
  events: CampusEvent[];
  isLoading: boolean;
  isRefreshing: boolean;
  actingId: string | null;
  error: string | null;
  message: string | null;
  refresh: () => Promise<void>;
  approve: (eventId: string) => Promise<string | null>;
  reject: (
    eventId: string,
    rejectionReason: string | null,
  ) => Promise<string | null>;
}

export function useAdminPendingEvents(): UseAdminPendingEventsResult {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(async (isRefresh: boolean): Promise<void> => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!activeRef.current) return;

    if (fetchError) {
      setError(toErrorMessage(fetchError, "Could not load pending events."));
      setEvents([]);
    } else {
      setEvents(((data ?? []) as EventRow[]).map(mapEvent));
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

  const approve = useCallback(async (eventId: string): Promise<string | null> => {
    const target = events.find((e) => e.id === eventId);
    const publishAt = target?.publishAt ? new Date(target.publishAt) : null;
    const isScheduled =
      publishAt != null &&
      !Number.isNaN(publishAt.getTime()) &&
      publishAt > new Date();

    setActingId(eventId);
    setError(null);
    const { error: updateError } = await supabase
      .from("events")
      .update({ status: "approved" })
      .eq("id", eventId);

    if (!activeRef.current) return null;
    setActingId(null);

    if (updateError) {
      const msg = toErrorMessage(updateError, "Could not approve event.");
      setError(msg);
      return msg;
    }

    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setMessage(
      isScheduled
        ? "Event approved. It will show as Coming Soon until the publish date."
        : "Event approved and now live on the public feed.",
    );
    return null;
  }, [events]);

  const reject = useCallback(
    async (
      eventId: string,
      rejectionReason: string | null,
    ): Promise<string | null> => {
      setActingId(eventId);
      setError(null);
      const { error: updateError } = await supabase
        .from("events")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason?.trim() || null,
        })
        .eq("id", eventId);

      if (!activeRef.current) return null;
      setActingId(null);

      if (updateError) {
        const msg = toErrorMessage(updateError, "Could not reject event.");
        setError(msg);
        return msg;
      }

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setMessage("Event rejected and removed from queue.");
      return null;
    },
    [],
  );

  return {
    events,
    isLoading,
    isRefreshing,
    actingId,
    error,
    message,
    refresh: () => load(true),
    approve,
    reject,
  };
}
