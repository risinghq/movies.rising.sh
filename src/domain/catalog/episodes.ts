import { and, asc, count, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "void/db";
import { episodes, media } from "@schema";
import { insertChunks, selectByIds, type Statement } from "@/db/kernel";
import type { EpisodeInput } from "@/shared/types/metadata";
import type { EpisodeRef } from "@/shared/tracking";
import type { EpisodeRecord, SeasonEpisodes, SeasonSummary } from "@/shared/catalog";

export type { EpisodeRecord, SeasonEpisodes, SeasonSummary };

export type EpisodeRuntime = {
  mediaId: string;
  seasonNumber: number;
  episodeNumber: number;
  runtime: number | null;
};

export async function episodeRuntimesByMedia(
  mediaIds: readonly string[],
): Promise<EpisodeRuntime[]> {
  return selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: episodes.mediaId,
        seasonNumber: episodes.seasonNumber,
        episodeNumber: episodes.episodeNumber,
        runtime: episodes.runtime,
      })
      .from(episodes)
      .where(inArray(episodes.mediaId, batch))
      .orderBy(asc(episodes.mediaId), asc(episodes.seasonNumber), asc(episodes.episodeNumber)),
  );
}

export async function listSeasonSummaries(mediaId: string): Promise<SeasonSummary[]> {
  return db
    .select({ seasonNumber: episodes.seasonNumber, episodeCount: count() })
    .from(episodes)
    .where(eq(episodes.mediaId, mediaId))
    .groupBy(episodes.seasonNumber)
    .orderBy(asc(episodes.seasonNumber));
}

export async function listSeasonEpisodes(
  mediaId: string,
  seasonNumber: number,
): Promise<EpisodeRecord[]> {
  return db
    .select({
      seasonNumber: episodes.seasonNumber,
      episodeNumber: episodes.episodeNumber,
      name: episodes.name,
      runtime: episodes.runtime,
      airDate: episodes.airDate,
    })
    .from(episodes)
    .where(and(eq(episodes.mediaId, mediaId), eq(episodes.seasonNumber, seasonNumber)))
    .orderBy(asc(episodes.episodeNumber));
}

// An episode counts as aired when its air date has passed, or is unknown. ISO
// They sort correctly as strings.
export async function airedEpisodeRefs(
  mediaIds: readonly string[],
): Promise<Map<string, EpisodeRef[]>> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: episodes.mediaId,
        seasonNumber: episodes.seasonNumber,
        episodeNumber: episodes.episodeNumber,
      })
      .from(episodes)
      .where(
        and(
          inArray(episodes.mediaId, batch),
          or(isNull(episodes.airDate), lte(episodes.airDate, today)),
        ),
      )
      .orderBy(asc(episodes.mediaId), asc(episodes.seasonNumber), asc(episodes.episodeNumber)),
  );

  const byMedia = new Map<string, EpisodeRef[]>();
  for (const row of rows) {
    const list = byMedia.get(row.mediaId) ?? [];
    list.push({ seasonNumber: row.seasonNumber, episodeNumber: row.episodeNumber });
    byMedia.set(row.mediaId, list);
  }
  return byMedia;
}

export function mediaEpisodesWrite(mediaId: string, items: EpisodeInput[]): Statement[] {
  const now = Date.now();
  const rows = items.map((e) => ({
    id: `${mediaId}:s${e.seasonNumber}e${e.episodeNumber}`,
    mediaId,
    seasonNumber: e.seasonNumber,
    episodeNumber: e.episodeNumber,
    name: e.name,
    runtime: e.runtime,
    airDate: e.airDate,
    createdAt: now,
    updatedAt: now,
  }));

  return [
    db.delete(episodes).where(eq(episodes.mediaId, mediaId)),
    ...insertChunks(rows, (part) => db.insert(episodes).values(part)),
  ];
}

export function markEpisodesFreshWrite(mediaId: string): Statement[] {
  const now = Date.now();
  return [
    db
      .update(media)
      .set({ episodesHydratedAt: now, episodesError: null, updatedAt: now })
      .where(eq(media.id, mediaId)),
  ];
}

export function markEpisodesFailedWrite(mediaId: string, error: string): Statement[] {
  const now = Date.now();
  return [
    db.update(media).set({ episodesError: error, updatedAt: now }).where(eq(media.id, mediaId)),
  ];
}
