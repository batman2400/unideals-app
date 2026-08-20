/**
 * Helpers for Coming Soon / scheduled launch UX.
 * Port of the web app's `src/lib/comingSoon.js`.
 */
import type { CampusEvent, Deal } from "@/types/database";

export function isComingSoonDeal(deal: Deal): boolean {
  if (deal.isComingSoon) return true;
  if (!deal.startTime) return false;
  const t = new Date(deal.startTime);
  return !Number.isNaN(t.getTime()) && t.getTime() > Date.now();
}

export function isExpiredDeal(deal: Pick<Deal, "endTime">): boolean {
  if (!deal.endTime) return false;
  const t = new Date(deal.endTime);
  return !Number.isNaN(t.getTime()) && t.getTime() < Date.now();
}

/** Past campus events — same cutoff as the student Events tab. */
export function isFinishedEvent(
  event: Pick<CampusEvent, "startTime" | "endTime">,
  now = new Date(),
): boolean {
  const startTime = new Date(event.startTime);
  if (Number.isNaN(startTime.getTime())) return false;

  const endTime = event.endTime ? new Date(event.endTime) : null;
  const isUpcoming = startTime > now;
  const isOngoing = Boolean(
    endTime && !Number.isNaN(endTime.getTime()) && endTime > now,
  );
  const isRecentNoEnd =
    !endTime && now.getTime() - startTime.getTime() < 24 * 60 * 60 * 1000;

  return !(isUpcoming || isOngoing || isRecentNoEnd);
}

export function isComingSoonEvent(event: CampusEvent): boolean {
  if (!event.publishAt) return false;
  const t = new Date(event.publishAt);
  return !Number.isNaN(t.getTime()) && t.getTime() > Date.now();
}

export function formatLaunchDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLaunchRelative(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfLaunch = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startOfLaunch.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dayDiff <= 0) return "Opens today";
  if (dayDiff === 1) return "Opens tomorrow";
  if (dayDiff <= 7) return `Opens in ${dayDiff} days`;

  return `Available ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

/** Partner-controlled start/end labels for student cards and deal detail. */
export function formatDealVisibleSchedule(
  deal: Pick<Deal, "startTime" | "endTime" | "showStartDate" | "showEndDate">,
): string | null {
  const parts: string[] = [];
  if (deal.showStartDate) {
    const start = formatLaunchDate(deal.startTime);
    if (start) parts.push(`Starts ${start}`);
  }
  if (deal.showEndDate) {
    const end = formatLaunchDate(deal.endTime);
    if (end) parts.push(`Ends ${end}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function dealLaunchMs(deal: Deal): number {
  const t = deal.startTime ? new Date(deal.startTime).getTime() : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function eventPublishMs(event: CampusEvent): number {
  const t = event.publishAt ? new Date(event.publishAt).getTime() : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

export function sortComingSoonDeals(deals: Deal[]): Deal[] {
  return [...deals].sort((a, b) => dealLaunchMs(a) - dealLaunchMs(b));
}

export function sortComingSoonEvents(events: CampusEvent[]): CampusEvent[] {
  return [...events].sort((a, b) => eventPublishMs(a) - eventPublishMs(b));
}

export function partitionDeals(deals: Deal[]): {
  live: Deal[];
  comingSoon: Deal[];
} {
  const live: Deal[] = [];
  const comingSoon: Deal[] = [];
  for (const deal of deals) {
    if (isExpiredDeal(deal)) continue;
    if (isComingSoonDeal(deal)) comingSoon.push(deal);
    else live.push(deal);
  }
  return { live, comingSoon: sortComingSoonDeals(comingSoon) };
}

/** Split approved events into live listings vs Coming Soon (future publish_at). */
export function partitionEvents(events: CampusEvent[]): {
  live: CampusEvent[];
  comingSoon: CampusEvent[];
} {
  const live: CampusEvent[] = [];
  const comingSoon: CampusEvent[] = [];
  for (const event of events) {
    if (isComingSoonEvent(event)) comingSoon.push(event);
    else live.push(event);
  }
  return { live, comingSoon: sortComingSoonEvents(comingSoon) };
}

/**
 * Within live (already published) events, split into upcoming/ongoing vs past —
 * same rules as the web UniversityEvents page.
 */
export function splitLiveEvents(liveEvents: CampusEvent[]): {
  active: CampusEvent[];
  past: CampusEvent[];
} {
  const now = new Date();
  const active: CampusEvent[] = [];
  const past: CampusEvent[] = [];

  for (const event of liveEvents) {
    if (isFinishedEvent(event, now)) past.push(event);
    else active.push(event);
  }

  active.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  past.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  return { active, past };
}

export function formatEventWhen(event: CampusEvent): string {
  const start = new Date(event.startTime);
  if (Number.isNaN(start.getTime())) return "Date TBA";

  const startLabel = start.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (!event.endTime) return startLabel;

  const end = new Date(event.endTime);
  if (Number.isNaN(end.getTime())) return startLabel;

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${startLabel} – ${end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return `${startLabel} – ${end.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
