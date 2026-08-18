/**
 * useAdminInquiries — port of web AdminInquiries.jsx data layer.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase, toErrorMessage } from "@/lib/supabase";
import type { Inquiry, InquiryRow } from "@/types/database";
import { mapInquiry } from "@/types/database";

export type InquiryFilter = "new" | "all";

export interface UseAdminInquiriesResult {
  inquiries: Inquiry[];
  isLoading: boolean;
  isRefreshing: boolean;
  actingId: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  setStatus: (id: string, status: string) => Promise<string | null>;
}

export function useAdminInquiries(
  filter: InquiryFilter,
): UseAdminInquiriesResult {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
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

      let query = supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "new") {
        query = query.eq("status", "new");
      }

      const { data, error: fetchError } = await query;

      if (!activeRef.current) return;

      if (fetchError) {
        setError(toErrorMessage(fetchError, "Failed to load inquiries."));
        setInquiries([]);
      } else {
        setInquiries(((data ?? []) as InquiryRow[]).map(mapInquiry));
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [filter],
  );

  useEffect(() => {
    activeRef.current = true;
    void load(false);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const setStatus = useCallback(
    async (id: string, status: string): Promise<string | null> => {
      setActingId(id);
      setError(null);
      const { error: updateError } = await supabase
        .from("inquiries")
        .update({ status })
        .eq("id", id);

      if (!activeRef.current) return null;
      setActingId(null);

      if (updateError) {
        const msg = toErrorMessage(updateError, "Failed to update status.");
        setError(msg);
        return msg;
      }

      if (filter === "new" && status !== "new") {
        setInquiries((prev) => prev.filter((inq) => inq.id !== id));
      } else {
        setInquiries((prev) =>
          prev.map((inq) => (inq.id === id ? { ...inq, status } : inq)),
        );
      }
      return null;
    },
    [filter],
  );

  return {
    inquiries,
    isLoading,
    isRefreshing,
    actingId,
    error,
    refresh: () => load(true),
    setStatus,
  };
}
