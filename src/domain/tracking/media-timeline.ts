import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "void/db";
import { watchEvents } from "@schema";
import { TIMELINE_DAYS } from "@/shared/community";

export type MediaTimelineDay = {
  date: string;
  watches: number;
};

export type MediaTimelineView = {
  /** One entry per day of the window, oldest first, zero-filled. */
  days: MediaTimelineDay[];
  windowWatches: number;
  viewers: number;
  lastDay: string | null;
};

const DAY_MS = 86_400_000;

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// watchedOn is the viewer's local date, so a viewer east of UTC can log a day
// past the server's today. Those plays count toward the last day of the window.
function fillWindow(rows: MediaTimelineDay[], now: number): MediaTimelineDay[] {
  const today = isoDay(now);
  const counts = new Map<string, number>();
  for (const row of rows) {
    const date = row.date > today ? today : row.date;
    counts.set(date, (counts.get(date) ?? 0) + row.watches);
  }
  return Array.from({ length: TIMELINE_DAYS }, (_, index) => {
    const date = isoDay(now - (TIMELINE_DAYS - 1 - index) * DAY_MS);
    return { date, watches: counts.get(date) ?? 0 };
  });
}

export async function getTimelineView(
  mediaId: string,
  now = Date.now(),
): Promise<MediaTimelineView> {
  const start = isoDay(now - (TIMELINE_DAYS - 1) * DAY_MS);

  const [daily, totals] = await Promise.all([
    db
      .select({
        date: sql<string>`${watchEvents.watchedOn}`,
        watches: sql<number>`count(*)`,
      })
      .from(watchEvents)
      .where(and(eq(watchEvents.mediaId, mediaId), gte(watchEvents.watchedOn, start)))
      .groupBy(watchEvents.watchedOn),
    db
      .select({
        viewers: sql<number>`count(distinct ${watchEvents.userId})`,
        lastDay: sql<string | null>`max(${watchEvents.watchedOn})`,
      })
      .from(watchEvents)
      .where(eq(watchEvents.mediaId, mediaId)),
  ]);

  const days = fillWindow(daily, now);
  return {
    days,
    windowWatches: days.reduce((sum, day) => sum + day.watches, 0),
    viewers: totals[0]?.viewers ?? 0,
    lastDay: totals[0]?.lastDay ?? null,
  };
}
