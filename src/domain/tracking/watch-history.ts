import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "void/db";
import { libraryEntries, media, watchEvents } from "@schema";
import type { MediaType } from "@/domain/catalog/media";

export type WatchHistoryRow = {
  id: string;
  mediaId: string;
  mediaType: MediaType;
  title: string;
  slug: string;
  posterPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  score100: number | null;
  watchedAt: number;
  watchedOn: string;
  utcOffsetMinutes: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
};

// Dated plays only: every reader (heatmap, feed, recaps, mirror) places a play
// in time, and an undated play has no place there.
// Filters on local watch day (YYYY-MM-DD): `since` inclusive, `until` exclusive.
// A year window is [`{year}-01-01`, `{year+1}-01-01`). Omit both for all-time.
export async function listWatchHistory(
  userId: string,
  window?: { since?: string; until?: string },
): Promise<WatchHistoryRow[]> {
  const filters = [eq(watchEvents.userId, userId), isNotNull(watchEvents.watchedAt)];
  if (window?.since) filters.push(gte(watchEvents.watchedOn, window.since));
  if (window?.until) filters.push(lt(watchEvents.watchedOn, window.until));

  return db
    .select({
      id: watchEvents.id,
      mediaId: watchEvents.mediaId,
      mediaType: watchEvents.mediaType,
      title: media.title,
      slug: media.slug,
      posterPath: media.posterPath,
      releaseDate: media.releaseDate,
      runtime: media.runtime,
      score100: libraryEntries.score100,
      watchedAt: sql<number>`${watchEvents.watchedAt}`,
      watchedOn: sql<string>`${watchEvents.watchedOn}`,
      utcOffsetMinutes: sql<number>`${watchEvents.utcOffsetMinutes}`,
      seasonNumber: watchEvents.seasonNumber,
      episodeNumber: watchEvents.episodeNumber,
    })
    .from(watchEvents)
    .innerJoin(media, eq(watchEvents.mediaId, media.id))
    .leftJoin(
      libraryEntries,
      and(eq(libraryEntries.userId, userId), eq(libraryEntries.mediaId, watchEvents.mediaId)),
    )
    .where(and(...filters));
}

export async function listWatchYears(userId: string): Promise<number[]> {
  const yearExpr = sql<string>`substr(${watchEvents.watchedOn}, 1, 4)`;
  const rows = await db
    .selectDistinct({ year: yearExpr })
    .from(watchEvents)
    .where(and(eq(watchEvents.userId, userId), isNotNull(watchEvents.watchedOn)));

  return rows
    .map((row) => Number(row.year))
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => b - a);
}
