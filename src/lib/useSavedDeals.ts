/**
 * Batch saved-deal IDs for the signed-in user.
 * Port of the web app's `useSavedDealIds` in `src/lib/useDeals.js`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { supabase, toErrorMessage } from "@/lib/supabase";

const DUPLICATE_SAVE_CODE = "23505";

export interface UseSavedDealsResult {
  savedIds: Set<number>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleSave: (dealId: number) => Promise<void>;
}

export function useSavedDeals(): UseSavedDealsResult {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);
  const pendingRef = useRef(new Set<number>());
  const loadedForUserRef = useRef<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!user) {
      loadedForUserRef.current = null;
      setSavedIds(new Set());
      setError(null);
      setIsLoading(false);
      return;
    }

    if (loadedForUserRef.current !== user.id) {
      setSavedIds(new Set());
      setIsLoading(true);
    }

    const { data, error: queryError } = await supabase
      .from("saved_deals")
      .select("deal_id")
      .eq("user_id", user.id);

    if (!activeRef.current) return;

    if (queryError) {
      setError(toErrorMessage(queryError, "Could not load saved deals."));
      if (loadedForUserRef.current !== user.id) {
        setSavedIds(new Set());
      }
    } else {
      loadedForUserRef.current = user.id;
      setError(null);
      setSavedIds(new Set((data ?? []).map((row) => Number(row.deal_id))));
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    activeRef.current = true;
    void load();
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const toggleSave = useCallback(
    async (dealId: number): Promise<void> => {
      if (!user) {
        Alert.alert("Sign in required", "Sign in to save deals.");
        return;
      }
      if (pendingRef.current.has(dealId)) return;

      const wasSaved = savedIds.has(dealId);
      pendingRef.current.add(dealId);

      setSavedIds((previous) => {
        const next = new Set(previous);
        if (wasSaved) {
          next.delete(dealId);
        } else {
          next.add(dealId);
        }
        return next;
      });

      try {
        if (wasSaved) {
          const { error: deleteError } = await supabase
            .from("saved_deals")
            .delete()
            .eq("user_id", user.id)
            .eq("deal_id", dealId);
          if (deleteError) throw deleteError;
        } else {
          const { error: insertError } = await supabase.from("saved_deals").insert({
            user_id: user.id,
            deal_id: dealId,
          });
          if (insertError && insertError.code !== DUPLICATE_SAVE_CODE) {
            throw insertError;
          }
        }
      } catch (caught) {
        if (activeRef.current) {
          setSavedIds((previous) => {
            const next = new Set(previous);
            if (wasSaved) {
              next.add(dealId);
            } else {
              next.delete(dealId);
            }
            return next;
          });
          Alert.alert(
            "Could not update saved deals",
            toErrorMessage(caught, "Please try again."),
          );
        }
      } finally {
        pendingRef.current.delete(dealId);
      }
    },
    [savedIds, user],
  );

  return { savedIds, isLoading, error, refresh: load, toggleSave };
}
