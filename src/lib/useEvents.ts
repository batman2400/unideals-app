/**
 * useEvents / useEvent
 *
 * Port of the web app's `src/lib/useEvents.js`.
 * - List: approved public events ordered by start_time
 * - Detail: single event by id (RLS: approved, own, or admin)
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { isFinishedEvent } from "@/lib/eventTiming";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { REQUEST_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";
import { mapEvent, type CampusEvent, type EventRow } from "@/types/database";

const eventsById = new Map<string, CampusEvent>();

export function rememberEvents(events: readonly CampusEvent[]): void {
  for (const event of events) {
    if (event.id) eventsById.set(String(event.id), event);
  }
}

export function rememberedEvent(id: string | undefined): CampusEvent | null {
  if (!id) return null;
  return eventsById.get(String(id)) ?? null;
}

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

    try {
      const { data, error: fetchError } = await withTimeout(
        supabase
          .from("events")
          .select("*")
          .eq("status", "approved")
          .order("start_time", { ascending: true }),
        REQUEST_TIMEOUT_MS,
        "Request timed out. Please check your connection.",
      );

      if (!activeRef.current) return;

      if (fetchError) {
        setError(toErrorMessage(fetchError, "Could not load events."));
      } else {
        const mapped = ((data ?? []) as EventRow[])
          .map(mapEvent)
          .filter((event) => !isFinishedEvent(event));
        rememberEvents(mapped);
        setEvents(mapped);
      }
    } catch (err) {
      if (!activeRef.current) return;
      setError(toErrorMessage(err, "Could not load events."));
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
  const cachedOnMount = rememberedEvent(id);
  const [event, setEvent] = useState<CampusEvent | null>(cachedOnMount);
  const [isLoading, setIsLoading] = useState(cachedOnMount == null);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);
  const requestIdRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;

    if (!id) {
      setEvent(null);
      setError("Invalid event id.");
      setIsLoading(false);
      return;
    }

    const cached = rememberedEvent(id);
    if (cached) {
      setEvent(cached);
      setError(null);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const { data, error: fetchError } = await withTimeout(
        supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .limit(1),
        REQUEST_TIMEOUT_MS,
        "Opening this event is taking too long. Check your connection and try again.",
      );

      if (!activeRef.current || requestId !== requestIdRef.current) return;

      if (fetchError) {
        if (!rememberedEvent(id)) {
          setError(toErrorMessage(fetchError, "Could not load this event."));
          setEvent(null);
        }
        return;
      }

      const rows = (Array.isArray(data) ? data : data ? [data] : []) as EventRow[];
      const next = rows[0] ? mapEvent(rows[0]) : null;
      if (next) rememberEvents([next]);
      setEvent(next);
      setError(next ? null : "This event could not be found.");
    } catch (caught) {
      if (!activeRef.current || requestId !== requestIdRef.current) return;
      if (!rememberedEvent(id)) {
        setEvent(null);
        setError(toErrorMessage(caught, "Could not load this event."));
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
      event.locationAddress,
    ].some((field) => field?.toLowerCase().includes(normalized)),
  );
}
