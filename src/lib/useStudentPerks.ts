import { useCallback, useEffect, useRef, useState } from "react";

import {
  PERK_SELECT,
  mapStudentPerk,
  perksSchemaMissing,
  type StudentPerk,
  type StudentPerkRow,
} from "@/lib/studentPerks";
import { supabase, toErrorMessage } from "@/lib/supabase";

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

    const { data, error: fetchError } = await supabase
      .from("student_perks")
      .select(PERK_SELECT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("provider_name", { ascending: true });

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
      setPerks(((data ?? []) as StudentPerkRow[]).map(mapStudentPerk));
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
} {
  const [perk, setPerk] = useState<StudentPerk | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) {
      setPerk(null);
      setError("This perk is unavailable.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    void supabase
      .from("student_perks")
      .select(PERK_SELECT)
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) {
          setPerk(null);
          setError(
            perksSchemaMissing(fetchError)
              ? "Student perks are not live yet."
              : toErrorMessage(fetchError, "Couldn't load this perk."),
          );
        } else if (!data) {
          setPerk(null);
          setError("This perk is unavailable.");
        } else {
          setPerk(mapStudentPerk(data as StudentPerkRow));
        }
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  return { perk, isLoading, error };
}
