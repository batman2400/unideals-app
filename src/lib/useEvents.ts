/**
 * useEvents / useEvent
 *
 * Port of the web app's `src/lib/useEvents.js`.
 * - List: approved public events ordered by start_time
 * - Detail: single event by id (RLS: approved, own, or admin)
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase, toErrorMessage } from "@/lib/supabase";
import { mapEvent, type CampusEvent, type EventRow } from "@/types/database";

export interface UseEventsResult {
  events: CampusEvent[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<CampusEvent[]>([]);
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

    const { data, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("status", "approved")
      .order("start_time", { ascending: true });

    if (!activeRef.current) return;

    if (fetchError) {
      setError(toErrorMessage(fetchError, "Could not load events."));
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

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { events, isLoading, isRefreshing, error, refresh };
}

export interface UseEventResult {
  event: CampusEvent | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEvent(id: string | undefined): UseEventResult {
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    if (!id) {
      setEvent(null);
      setError("Invalid event id.");
      setIsLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle<EventRow>();

    if (!activeRef.current) return;

    if (fetchError) {
      setError(toErrorMessage(fetchError, "Could not load this event."));
      setEvent(null);
    } else {
      setEvent(data ? mapEvent(data) : null);
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    activeRef.current = true;
    void load();
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  return { event, isLoading, error, refresh: load };
}

/** Case-insensitive match across title, category, university, club, location. */
export function filterEvents(
  events: CampusEvent[],
  query: string,
): CampusEvent[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return events;

  return events.filter((event) =>
    [
      event.title,
      event.category,
      event.universityName,
      event.clubName,
      event.locationName,
    ].some((field) => field?.toLowerCase().includes(normalized)),
  );
}

