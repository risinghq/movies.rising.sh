import type { favoriteMedia } from "@schema";
import { toMediaId, type MediaType } from "@/domain/catalog/media";
import { instantFor } from "@/domain/instant";
import type { LibraryEntryRecord } from "@/domain/tracking/library-entries";
import type { WatchEventInsert } from "@/domain/tracking/watch-events";
import type { LibraryStatus } from "@/shared/library-status";
import type { ImportItem, ImportMediaRef } from "./items";

export type FavoriteMediaInsert = typeof favoriteMedia.$inferInsert;

// What the user already has, read before the import writes.
export type ExistingLibrary = {
  playKeys: ReadonlySet<string>;
  entries: ReadonlyMap<string, LibraryEntryRecord>;
  favorites: ReadonlySet<string>;
};

export type ImportCounts = {
  plays: number;
  undatedPlays: number;
  duplicatePlays: number;
  entriesCreated: number;
  entriesUpdated: number;
  scores: number;
  scoresKept: number;
  favorites: number;
};

export type ImportPlan = {
  media: ImportMediaRef[];
  plays: WatchEventInsert[];
  entries: LibraryEntryRecord[];
  favorites: FavoriteMediaInsert[];
  counts: ImportCounts;
};

export type PlanContext = {
  userId: string;
  importId: string;
  timeZone: string | null;
  now: number;
};

// Each title's imported intent, folded from all of its items.
type TitleIntent = {
  media: ImportMediaRef;
  hasPlays: boolean;
  rating: { score100: number; ratedAt: number } | null;
  planned: boolean;
  dropped: boolean;
  favorite: boolean;
  note: string | null;
};

export function playKey(
  mediaId: string,
  seasonNumber: number | null,
  episodeNumber: number | null,
  watchedAt: number | null,
): string {
  return `${mediaId}|${seasonNumber ?? ""}|${episodeNumber ?? ""}|${watchedAt ?? ""}`;
}

export function planImport(
  items: readonly ImportItem[],
  existing: ExistingLibrary,
  context: PlanContext,
): ImportPlan {
  const counts: ImportCounts = {
    plays: 0,
    undatedPlays: 0,
    duplicatePlays: 0,
    entriesCreated: 0,
    entriesUpdated: 0,
    scores: 0,
    scoresKept: 0,
    favorites: 0,
  };
  const intents = foldIntents(items);
  const plays = planPlays(items, existing, context, counts);
  const entries: LibraryEntryRecord[] = [];
  const favorites: FavoriteMediaInsert[] = [];

  for (const [mediaId, intent] of intents) {
    const entry = planEntry(
      mediaId,
      intent,
      existing.entries.get(mediaId) ?? null,
      context,
      counts,
    );
    if (entry) entries.push(entry);
    if (intent.favorite && !existing.favorites.has(mediaId)) {
      favorites.push({
        id: `${context.userId}:fav:${mediaId}`,
        userId: context.userId,
        mediaId,
        importId: context.importId,
        createdAt: context.now,
      });
      counts.favorites += 1;
    }
  }

  const media = [...intents.values()].map((intent) => intent.media);
  return { media, plays, entries, favorites, counts };
}

function foldIntents(items: readonly ImportItem[]): Map<string, TitleIntent> {
  const intents = new Map<string, TitleIntent>();
  for (const item of items) {
    const mediaId = toMediaId(item.media.mediaType, item.media.tmdbId);
    let intent = intents.get(mediaId);
    if (!intent) {
      intent = emptyIntent(item.media);
      intents.set(mediaId, intent);
    }
    applyItem(intent, item);
  }
  return intents;
}

function emptyIntent(media: ImportMediaRef): TitleIntent {
  return {
    media,
    hasPlays: false,
    rating: null,
    planned: false,
    dropped: false,
    favorite: false,
    note: null,
  };
}

function applyItem(intent: TitleIntent, item: ImportItem): void {
  switch (item.kind) {
    case "play":
      intent.hasPlays = true;
      return;
    case "planned":
      intent.planned = true;
      return;
    case "dropped":
      intent.dropped = true;
      return;
    case "favorite":
      intent.favorite = true;
      intent.note = item.note ?? intent.note;
      return;
    case "rating":
      // Between sources, the most recently given score wins.
      if (!intent.rating || item.ratedAt > intent.rating.ratedAt) {
        intent.rating = { score100: item.score100, ratedAt: item.ratedAt };
      }
  }
}

function planPlays(
  items: readonly ImportItem[],
  existing: ExistingLibrary,
  context: PlanContext,
  counts: ImportCounts,
): WatchEventInsert[] {
  const seen = new Set(existing.playKeys);
  const plays: WatchEventInsert[] = [];
  for (const item of items) {
    if (item.kind !== "play") continue;
    const mediaId = toMediaId(item.media.mediaType, item.media.tmdbId);
    const season = item.episode?.seasonNumber ?? null;
    const episode = item.episode?.episodeNumber ?? null;
    const watchedAt =
      item.watchedAt ?? (item.watchedOn ? localNoon(item.watchedOn, context.timeZone) : null);
    const key = playKey(mediaId, season, episode, watchedAt);
    if (seen.has(key)) {
      counts.duplicatePlays += 1;
      continue;
    }
    seen.add(key);
    const instant = watchedAt === null ? null : instantFor(watchedAt, context.timeZone);
    plays.push({
      id: crypto.randomUUID(),
      userId: context.userId,
      mediaId,
      mediaType: item.media.mediaType,
      seasonNumber: season,
      episodeNumber: episode,
      watchedAt: instant?.watchedAt ?? null,
      watchedOn: instant?.watchedOn ?? null,
      utcOffsetMinutes: instant?.utcOffsetMinutes ?? null,
      importId: context.importId,
      createdAt: context.now,
    });
    counts.plays += 1;
    if (!instant) counts.undatedPlays += 1;
  }
  return plays;
}

// A day-only play is placed at noon in the user's zone: the day stays the
// same in every zone, and a second import of the file yields the same instant,
// so its plays read as duplicates.
export function localNoon(day: string, timeZone: string | null): number {
  const noonUtc = Date.parse(`${day}T12:00:00Z`);
  return noonUtc - instantFor(noonUtc, timeZone).utcOffsetMinutes * 60_000;
}

// Returns the entry to upsert, or null when the import changes nothing.
function planEntry(
  mediaId: string,
  intent: TitleIntent,
  prev: LibraryEntryRecord | null,
  context: PlanContext,
  counts: ImportCounts,
): LibraryEntryRecord | null {
  const status = importedStatus(intent);
  if (!prev) {
    counts.entriesCreated += 1;
    if (intent.rating) counts.scores += 1;
    return {
      id: crypto.randomUUID(),
      userId: context.userId,
      mediaId,
      filedStatus: status,
      score100: intent.rating?.score100 ?? null,
      notes: intent.note,
      importId: context.importId,
      createdAt: context.now,
      updatedAt: context.now,
    };
  }

  // The user's own data wins: a score or note already set stays, and a filed
  // status moves only up from planned.
  const filedStatus = prev.filedStatus === "planned" ? status : prev.filedStatus;
  const score100 = prev.score100 ?? intent.rating?.score100 ?? null;
  const notes = prev.notes ?? intent.note;
  if (intent.rating && prev.score100 !== null) counts.scoresKept += 1;
  if (intent.rating && prev.score100 === null) counts.scores += 1;

  const changed =
    filedStatus !== prev.filedStatus || score100 !== prev.score100 || notes !== prev.notes;
  if (!changed) return null;
  counts.entriesUpdated += 1;
  return { ...prev, filedStatus, score100, notes, updatedAt: context.now };
}

// The filed status an import implies. Plays stay "planned": the displayed
// status derives from watch progress (resolveStatus), as for a manual log.
function importedStatus(intent: TitleIntent): LibraryStatus {
  if (intent.dropped) return "dropped";
  if (intent.hasPlays) return "planned";
  if (intent.rating) return ratedWithoutPlays(intent.media.mediaType);
  return "planned";
}

// A rated title with no plays was seen: TMDB keeps ratings but no history.
function ratedWithoutPlays(mediaType: MediaType): LibraryStatus {
  return mediaType === "movie" ? "completed" : "watching";
}
