import { useCallback, useEffect, useRef, useState } from "react";

import {
  PERK_SELECT,
  mapStudentPerk,
  perksSchemaMissing,
  type StudentPerk,
  type StudentPerkRow,
} from "@/lib/studentPerks";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { REQUEST_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";

const perksById = new Map<string, StudentPerk>();

export function rememberStudentPerks(perks: readonly StudentPerk[]): void {
  for (const perk of perks) {
    if (perk.id) perksById.set(String(perk.id), perk);
  }
}

export function rememberedStudentPerk(
  id: string | undefined,
): StudentPerk | null {
  if (!id) return null;
  return perksById.get(String(id)) ?? null;
}

export interface UseStudentPerksResult {
  perks: StudentPerk[];
  isLoading: boolean;
  isRefreshing: boolean;
  unavailable: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStudentPerks(): UseStudentPerksResult {
  const [perks, setPerks] = useState<StudentPerk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(async (isRefresh: boolean): Promise<void> => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await withTimeout(
        supabase
          .from("student_perks")
          .select(PERK_SELECT)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("provider_name", { ascending: true }),
        REQUEST_TIMEOUT_MS,
        "Couldn't load student perks. Check your connection and try again.",
      );

      if (!activeRef.current) return;

      if (fetchError) {
        if (perksSchemaMissing(fetchError)) {
          setPerks([]);
          setUnavailable(true);
          setError(null);
        } else {
          setUnavailable(false);
          setError(toErrorMessage(fetchError, "Couldn't load student perks."));
        }
      } else {
        setUnavailable(false);
        const mapped = ((data ?? []) as StudentPerkRow[]).map(mapStudentPerk);
        rememberStudentPerks(mapped);
        setPerks(mapped);
      }
    } catch (caught) {
      if (!activeRef.current) return;
      setUnavailable(false);
      setError(toErrorMessage(caught, "Couldn't load student perks."));
    } finally {
      if (activeRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void load(false);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  return {
    perks,
    isLoading,
    isRefreshing,
    unavailable,
    error,
    refresh: () => load(true),
  };
}

export function useStudentPerk(id: string | undefined): {
  perk: StudentPerk | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const cachedOnMount = rememberedStudentPerk(id);
  const [perk, setPerk] = useState<StudentPerk | null>(cachedOnMount);
  const [isLoading, setIsLoading] = useState(
    Boolean(id) && cachedOnMount == null,
  );
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);
  const requestIdRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;

    if (!id) {
      setPerk(null);
      setError("This perk is unavailable.");
      setIsLoading(false);
      return;
    }

    const cached = rememberedStudentPerk(id);
    if (cached) {
      setPerk(cached);
      setError(null);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const { data, error: fetchError } = await withTimeout(
        supabase
          .from("student_perks")
          .select(PERK_SELECT)
          .eq("id", id)
          .limit(1),
        REQUEST_TIMEOUT_MS,
        "Opening this perk is taking too long. Check your connection and try again.",
      );

      if (!activeRef.current || requestId !== requestIdRef.current) return;

      if (fetchError) {
        if (!rememberedStudentPerk(id)) {
          setPerk(null);
          setError(
            perksSchemaMissing(fetchError)
              ? "Student perks are not live yet."
              : toErrorMessage(fetchError, "Couldn't load this perk."),
          );
        }
        return;
      }

      const rows = (
        Array.isArray(data) ? data : data ? [data] : []
      ) as StudentPerkRow[];
      const next = rows[0] ? mapStudentPerk(rows[0]) : null;
      if (next) rememberStudentPerks([next]);
      setPerk(next);
      setError(next ? null : "This perk is unavailable.");
    } catch (caught) {
      if (!activeRef.current || requestId !== requestIdRef.current) return;
      if (!rememberedStudentPerk(id)) {
        setPerk(null);
        setError(toErrorMessage(caught, "Couldn't load this perk."));
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
  }, [load]);

  return { perk, isLoading, error, refresh: load };
}
