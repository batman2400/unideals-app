import { useCallback, useEffect, useRef, useState } from "react";

import {
  PERK_SELECT,
  mapStudentPerk,
  officialHttpsUrl,
  perksSchemaMissing,
  type StudentPerk,
  type StudentPerkRow,
} from "@/lib/studentPerks";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { REQUEST_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";

export interface StudentPerkInput {
  providerName: string;
  category: string;
  summary: string;
  eligibility: string;
  claimSteps: string;
  officialUrl: string;
  availability: string;
  lastVerifiedOn: string;
  logoUrl: string;
  isActive: boolean;
}

function validate(input: StudentPerkInput): string | null {
  if (!input.providerName.trim()) return "Provider name is required.";
  if (!input.summary.trim()) return "Summary is required.";
  if (!officialHttpsUrl(input.officialUrl)) {
    return "Official link must start with https://.";
  }
  if (input.logoUrl.trim() && !officialHttpsUrl(input.logoUrl)) {
    return "Logo link must start with https://.";
  }
  if (input.lastVerifiedOn.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(input.lastVerifiedOn.trim())) {
    return "Last verified date must look like 2026-10-12.";
  }
  return null;
}

function toRow(input: StudentPerkInput, sortOrder: number) {
  return {
    provider_name: input.providerName.trim(),
    category: input.category.trim() || null,
    summary: input.summary.trim(),
    eligibility: input.eligibility.trim() || null,
    claim_steps: input.claimSteps.trim() || null,
    official_url: officialHttpsUrl(input.officialUrl),
    availability: input.availability.trim() || null,
    last_verified_on: input.lastVerifiedOn.trim() || null,
    logo_url: input.logoUrl.trim() ? officialHttpsUrl(input.logoUrl) : null,
    is_active: input.isActive,
    sort_order: sortOrder,
  };
}

export interface UseAdminStudentPerksResult {
  perks: StudentPerk[];
  isLoading: boolean;
  isRefreshing: boolean;
  saving: boolean;
  unavailable: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  savePerk: (input: StudentPerkInput, id?: string) => Promise<string | null>;
  setActive: (perk: StudentPerk, isActive: boolean) => Promise<string | null>;
  movePerk: (perk: StudentPerk, direction: -1 | 1) => Promise<string | null>;
  deletePerk: (id: string) => Promise<string | null>;
}

export function useAdminStudentPerks(): UseAdminStudentPerksResult {
  const [perks, setPerks] = useState<StudentPerk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
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
        setPerks(((data ?? []) as StudentPerkRow[]).map(mapStudentPerk));
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

  const fail = useCallback((message: string): string => {
    setError(message);
    setSaving(false);
    return message;
  }, []);

  const savePerk = useCallback(
    async (input: StudentPerkInput, id?: string): Promise<string | null> => {
      const validationError = validate(input);
      if (validationError) return fail(validationError);

      setSaving(true);
      setError(null);
      const sortOrder = id
        ? (perks.find((perk) => perk.id === id)?.sortOrder ?? perks.length + 1)
        : Math.max(0, ...perks.map((perk) => perk.sortOrder)) + 1;

      const query = id
        ? supabase.from("student_perks").update(toRow(input, sortOrder)).eq("id", id)
        : supabase.from("student_perks").insert([toRow(input, sortOrder)]);
      const { error: saveError } = await query;
      if (!activeRef.current) return null;
      if (saveError) return fail(toErrorMessage(saveError, "Couldn't save that perk."));

      setSaving(false);
      await load(true);
      return null;
    },
    [fail, load, perks],
  );

  const setActive = useCallback(
    async (perk: StudentPerk, isActive: boolean): Promise<string | null> => {
      setSaving(true);
      setError(null);
      const { error: updateError } = await supabase
        .from("student_perks")
        .update({ is_active: isActive })
        .eq("id", perk.id);
      if (!activeRef.current) return null;
      if (updateError) return fail(toErrorMessage(updateError, "Couldn't update that perk."));
      setSaving(false);
      await load(true);
      return null;
    },
    [fail, load],
  );

  const movePerk = useCallback(
    async (perk: StudentPerk, direction: -1 | 1): Promise<string | null> => {
      const index = perks.findIndex((item) => item.id === perk.id);
      const neighbor = perks[index + direction];
      if (!neighbor) return null;

      setSaving(true);
      setError(null);
      const first = await supabase
        .from("student_perks")
        .update({ sort_order: neighbor.sortOrder })
        .eq("id", perk.id);
      if (first.error) return fail(toErrorMessage(first.error, "Couldn't reorder perks."));
      const second = await supabase
        .from("student_perks")
        .update({ sort_order: perk.sortOrder })
        .eq("id", neighbor.id);
      if (!activeRef.current) return null;
      if (second.error) return fail(toErrorMessage(second.error, "Couldn't reorder perks."));
      setSaving(false);
      await load(true);
      return null;
    },
    [fail, load, perks],
  );

  const deletePerk = useCallback(
    async (id: string): Promise<string | null> => {
      setSaving(true);
      setError(null);
      const { error: deleteError } = await supabase
        .from("student_perks")
        .delete()
        .eq("id", id);
      if (!activeRef.current) return null;
      if (deleteError) return fail(toErrorMessage(deleteError, "Couldn't delete that perk."));
      setSaving(false);
      await load(true);
      return null;
    },
    [fail, load],
  );

  return {
    perks,
    isLoading,
    isRefreshing,
    saving,
    unavailable,
    error,
    refresh: () => load(true),
    savePerk,
    setActive,
    movePerk,
    deletePerk,
  };
}
