import { instantFor } from "@/domain/instant";
import type { ImportItem } from "./items";

// Plays that share one minute in groups of BATCH_MIN_PLAYS or more were marked
// at once, not watched then. Measured on a real Trakt history of 1878 plays:
// such groups held 1237 plays over 24 days, and one day alone held 809 of them.
const BATCH_MIN_PLAYS = 5;

// A day whose batched plays reach this count is a backfill. Its plays default
// to undated. Smaller batches are usually "mark the season watched" on the day
// it was finished, so their day is kept. On the same history, the days at or
// above 20 held 1082 of the 1237 batched plays.
const BACKFILL_MIN_PLAYS = 20;

export type PlayBatchDay = {
  // Local day, YYYY-MM-DD, in the user's time zone.
  day: string;
  plays: number;
  undatedByDefault: boolean;
};

const MINUTE = 60_000;

export function findBatchDays(
  items: readonly ImportItem[],
  timeZone: string | null,
): PlayBatchDay[] {
  const byDay = new Map<string, number>();
  for (const [minute, plays] of batchedMinutes(items)) {
    const day = instantFor(minute * MINUTE, timeZone).watchedOn;
    byDay.set(day, (byDay.get(day) ?? 0) + plays);
  }
  return [...byDay]
    .map(([day, plays]) => ({ day, plays, undatedByDefault: plays >= BACKFILL_MIN_PLAYS }))
    .sort((a, b) => b.plays - a.plays || a.day.localeCompare(b.day));
}

// Clears the date of every batched play on the given local days.
export function undateBatchDays(
  items: readonly ImportItem[],
  days: ReadonlySet<string>,
  timeZone: string | null,
): ImportItem[] {
  const minutes = batchedMinutes(items);
  return items.map((item) => {
    if (item.kind !== "play" || item.watchedAt === null) return item;
    const minute = Math.floor(item.watchedAt / MINUTE);
    if (!minutes.has(minute)) return item;
    if (!days.has(instantFor(item.watchedAt, timeZone).watchedOn)) return item;
    return { ...item, watchedAt: null };
  });
}

function batchedMinutes(items: readonly ImportItem[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const item of items) {
    if (item.kind !== "play" || item.watchedAt === null) continue;
    const minute = Math.floor(item.watchedAt / MINUTE);
    counts.set(minute, (counts.get(minute) ?? 0) + 1);
  }
  for (const [minute, plays] of counts) {
    if (plays < BATCH_MIN_PLAYS) counts.delete(minute);
  }
  return counts;
}
