import type { MediaType } from "@/domain/catalog/media";
import { toScore100 } from "@/domain/rating";
import type { ImportItem, ImportMediaRef, ImportScan, SkippedItem } from "./items";

// The Trakt API v2 payloads the reader uses, as fetched from
// /users/{id}/history, /ratings, /watchlist, /favorites and
// /users/hidden/dropped. Each is the concatenation of every page read.
// `truncated` names the lists the reader cut short.
export type TraktExport = {
  history: unknown[];
  ratings: unknown[];
  watchlist: unknown[];
  favorites: unknown[];
  dropped: unknown[];
  truncated: string[];
};

type TraktIds = { tmdb?: unknown };
type TraktTitled = { title?: unknown; ids?: TraktIds };
type TraktEpisode = TraktTitled & { season?: unknown; number?: unknown };
type TraktRow = {
  type?: unknown;
  watched_at?: unknown;
  rated_at?: unknown;
  rating?: unknown;
  notes?: unknown;
  movie?: TraktTitled;
  show?: TraktTitled;
  episode?: TraktEpisode;
};

const TRAKT_TYPES: Record<string, MediaType> = { movie: "movie", show: "show" };

export function readTrakt(data: TraktExport): ImportScan {
  const items: ImportItem[] = [];
  const skipped: SkippedItem[] = [];
  const keep = (item: ImportItem | SkippedItem | null) => {
    if (!item) return;
    if ("reason" in item) skipped.push(item);
    else items.push(item);
  };

  for (const row of rows(data.history)) keep(readPlay(row));
  for (const row of rows(data.ratings)) keep(readRating(row));
  for (const row of rows(data.watchlist)) {
    keep(withTitle(row, (media) => ({ kind: "planned", media })));
  }
  for (const row of rows(data.favorites)) {
    keep(withTitle(row, (media) => ({ kind: "favorite", media, note: text(row.notes) })));
  }
  for (const row of rows(data.dropped)) {
    keep(withTitle(row, (media) => ({ kind: "dropped", media })));
  }
  for (const title of data.truncated) skipped.push({ reason: "list_truncated", title });
  return { items, skipped };
}

// Watchlists also hold seasons and episodes; only movies and shows map.
function withTitle(
  row: TraktRow,
  build: (media: ImportMediaRef) => ImportItem,
): ImportItem | SkippedItem | null {
  const media = titleRef(row);
  if (!media || !("tmdbId" in media)) return media;
  return build(media);
}

function readPlay(row: TraktRow): ImportItem | SkippedItem | null {
  const watchedAt = instant(row.watched_at);
  if (watchedAt === null) return null;

  if (row.type === "movie") {
    const media = ref("movie", row.movie);
    return "tmdbId" in media ? { kind: "play", media, episode: null, watchedAt } : media;
  }
  if (row.type !== "episode") return null;

  const media = ref("show", row.show);
  if (!("tmdbId" in media)) return media;
  const seasonNumber = row.episode?.season;
  const episodeNumber = row.episode?.number;
  if (typeof seasonNumber !== "number" || typeof episodeNumber !== "number") return null;
  return { kind: "play", media, episode: { seasonNumber, episodeNumber }, watchedAt };
}

// Trakt rates 1 to 10. Season and episode ratings have no place in the
// library, which scores whole titles.
function readRating(row: TraktRow): ImportItem | SkippedItem | null {
  if (typeof row.rating !== "number") return null;
  if (row.type === "season" || row.type === "episode") {
    const title = typeof row.show?.title === "string" ? row.show.title : "Unknown";
    return { reason: row.type === "season" ? "season_rating" : "episode_rating", title };
  }
  const score100 = Math.round(toScore100(row.rating, "score10"));
  const ratedAt = instant(row.rated_at) ?? 0;
  return withTitle(row, (media) => ({ kind: "rating", media, score100, ratedAt }));
}

function titleRef(row: TraktRow): ImportMediaRef | SkippedItem | null {
  const mediaType = typeof row.type === "string" ? TRAKT_TYPES[row.type] : undefined;
  if (!mediaType) return null;
  return ref(mediaType, mediaType === "movie" ? row.movie : row.show);
}

function ref(mediaType: MediaType, title: TraktTitled | undefined): ImportMediaRef | SkippedItem {
  const name = typeof title?.title === "string" ? title.title : "Unknown";
  const tmdbId = title?.ids?.tmdb;
  if (typeof tmdbId !== "number" || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    return { reason: "no_tmdb_id", title: name };
  }
  return { mediaType, tmdbId, title: name };
}

function rows(list: unknown[]): TraktRow[] {
  return list.filter((row): row is TraktRow => typeof row === "object" && row !== null);
}

function instant(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
