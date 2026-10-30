import { useCallback, useEffect, useState } from "react";

import { supabase, toErrorMessage } from "@/lib/supabase";
import { REQUEST_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";

export function isVerificationInFlight(status: string | null | undefined): boolean {
  return status === "pending" || status === "awaiting_confirmation";
}

export interface StudentVerificationRequest {
  id: string;
  status: string;
  method: string | null;
  rejectReason: string | null;
}

interface VerificationRequestRow {
  id: string | number;
  status: string;
  method: string | null;
  reject_reason: string | null;
}

export function useStudentVerificationRequest(
  userId: string | undefined,
  enabled: boolean,
) {
  const [request, setRequest] = useState<StudentVerificationRequest | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !enabled) {
      setRequest(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: rows, error: queryError } = await withTimeout(
        supabase
          .from("manual_verifications")
          .select("id, status, method, reject_reason")
          .eq("user_id", userId)
          .in("status", ["pending", "awaiting_confirmation", "rejected"])
          .order("created_at", { ascending: false })
          .limit(1),
        REQUEST_TIMEOUT_MS,
        "Could not load your verification status.",
      );

      if (queryError) {
        setError(
          toErrorMessage(queryError, "Could not load your verification status."),
        );
        return;
      }

      const row = ((Array.isArray(rows) ? rows[0] : rows) ??
        null) as VerificationRequestRow | null;
      setError(null);
      setRequest(
        row
          ? {
              id: String(row.id),
              status: row.status,
              method: row.method ?? null,
              rejectReason: row.reject_reason ?? null,
            }
          : null,
      );
    } catch (caught) {
      setError(
        toErrorMessage(caught, "Could not load your verification status."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    request,
    isLoading,
    error,
    refresh,
    isInFlight: isVerificationInFlight(request?.status),
  };
}
