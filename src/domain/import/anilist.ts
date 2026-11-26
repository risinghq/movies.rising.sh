import type { ImportItem, ImportMediaRef, ImportScan, SkippedItem } from "./items";

export const ANILIST_STATUSES = [
  "CURRENT",
  "PLANNING",
  "COMPLETED",
  "DROPPED",
  "PAUSED",
  "REPEATING",
] as const;
export type AnilistStatus = (typeof ANILIST_STATUSES)[number];

// One entry of a user's anime list, as the AniList client parses it.
export type AnilistEntry = {
  mediaId: number;
  title: string;
  status: AnilistStatus;
  // Episodes watched. On a REPEATING entry this counts the current rewatch.
  progress: number;
  // The series length; null while it airs.
  episodes: number | null;
  // 0 to 100; 0 means unrated.
  score100: number;
  // Epoch seconds.
  updatedAt: number;
  // YYYY-MM-DD, only when AniList holds the full date.
  completedOn: string | null;
};

export type AnilistExport = {
  entries: AnilistEntry[];
  favorites: { mediaId: number; title: string }[];
  // The lists the client cut short.
  truncated: string[];
};

// Where an AniList title lives on TMDB. AniList lists each season, cour or
// OVA as its own title; TMDB files most of them as a season of one show, and
// `offset` episodes of that season belong to earlier AniList titles. A null
// season means the mapping counts episodes across the whole show.
export type AnilistTarget =
  | { kind: "movie"; tmdbId: number }
  | { kind: "show"; tmdbId: number; season: number | null; offset: number };

export type AnilistMapping = ReadonlyMap<number, AnilistTarget>;

// Episodes per regular season of a show, for the titles mapped without a
// season. A show missing here could not be read from TMDB.
export type SeasonSizes = ReadonlyMap<number, readonly SeasonSize[]>;
export type SeasonSize = { seasonNumber: number; episodeCount: number };

const SEEN: ReadonlySet<AnilistStatus> = new Set(["COMPLETED", "REPEATING"]);

/** The TMDB shows whose episodes must be counted across seasons. */
export function showsNeedingSeasons(data: AnilistExport, mapping: AnilistMapping): number[] {
  const ids = new Set<number>();
  for (const entry of data.entries) {
    const target = mapping.get(entry.mediaId);
    if (target?.kind === "show" && target.season === null && watchedCount(entry) > 0) {
      ids.add(target.tmdbId);
    }
  }
  return [...ids];
}

export function readAnilist(
  data: AnilistExport,
  mapping: AnilistMapping,
  seasons: SeasonSizes,
): ImportScan {
  const items: ImportItem[] = [];
  const skipped: SkippedItem[] = [];
  const rated: Rated[] = [];

  for (const entry of data.entries) {
    const target = mapping.get(entry.mediaId);
    const read = target ? entryItems(entry, target, seasons) : null;
    if (!target || !read) {
      skipped.push({ reason: target ? "no_match" : "no_tmdb_id", title: entry.title });
      continue;
    }
    items.push(...read);
    if (entry.score100 > 0) {
      const media = mediaRef(target, entry.title);
      rated.push({ media, score100: entry.score100, ratedAt: entry.updatedAt * 1000 });
    }
  }
  items.push(...meanRatings(rated));

  const favorites = readFavorites(data.favorites, mapping);
  items.push(...favorites.items);
  skipped.push(...favorites.skipped);

  for (const title of data.truncated) skipped.push({ reason: "list_truncated", title });
  return { items: dropRepeatedEpisodes(items), skipped };
}

function readFavorites(favorites: AnilistExport["favorites"], mapping: AnilistMapping): ImportScan {
  const items: ImportItem[] = [];
  const skipped: SkippedItem[] = [];
  for (const favorite of favorites) {
    const target = mapping.get(favorite.mediaId);
    if (!target) skipped.push({ reason: "no_tmdb_id", title: favorite.title });
    else items.push({ kind: "favorite", media: mediaRef(target, favorite.title), note: null });
  }
  return { items, skipped };
}

type Rated = { media: ImportMediaRef; score100: number; ratedAt: number };

// The plays and list status of one entry, or null when its episodes cannot be
// placed on TMDB.
function entryItems(
  entry: AnilistEntry,
  target: AnilistTarget,
  seasons: SeasonSizes,
): ImportItem[] | null {
  const media = mediaRef(target, entry.title);
  const items: ImportItem[] = [];
  if (target.kind === "show") {
    const episodes = episodePlays(entry, target, seasons);
    if (!episodes) return null;
    items.push(
      ...episodes.map((episode) => ({ kind: "play" as const, media, episode, watchedAt: null })),
    );
  } else if (SEEN.has(entry.status)) {
    const watchedOn = entry.completedOn ? { watchedOn: entry.completedOn } : {};
    items.push({ kind: "play", media, episode: null, watchedAt: null, ...watchedOn });
  }
  if (entry.status === "PLANNING") items.push({ kind: "planned", media });
  if (entry.status === "DROPPED") items.push({ kind: "dropped", media });
  return items;
}

// The library scores whole titles, so the seasons of one show share the mean
// of their scores.
function meanRatings(rated: readonly Rated[]): ImportItem[] {
  const byTitle = Map.groupBy(rated, (r) => `${r.media.mediaType}:${r.media.tmdbId}`);
  return [...byTitle.values()].map((group) => ({
    kind: "rating",
    media: group[0]!.media,
    score100: Math.round(group.reduce((sum, r) => sum + r.score100, 0) / group.length),
    ratedAt: Math.max(...group.map((r) => r.ratedAt)),
  }));
}

// Two AniList titles can map onto the same TMDB episodes.
function dropRepeatedEpisodes(items: readonly ImportItem[]): ImportItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (item.kind !== "play" || !item.episode) return true;
    const key = `${item.media.tmdbId}:${item.episode.seasonNumber}:${item.episode.episodeNumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mediaRef(target: AnilistTarget, title: string): ImportMediaRef {
  return { mediaType: target.kind, tmdbId: target.tmdbId, title };
}

function watchedCount(entry: AnilistEntry): number {
  return SEEN.has(entry.status) ? (entry.episodes ?? entry.progress) : entry.progress;
}

// The episodes an entry marks watched, or null when its absolute numbers
// cannot be placed in TMDB's seasons.
function episodePlays(
  entry: AnilistEntry,
  target: Extract<AnilistTarget, { kind: "show" }>,
  seasons: SeasonSizes,
): { seasonNumber: number; episodeNumber: number }[] | null {
  const count = watchedCount(entry);
  if (count <= 0) return [];
  const numbers = Array.from({ length: count }, (_, i) => target.offset + i + 1);
  if (target.season !== null) {
    const seasonNumber = target.season;
    return numbers.map((episodeNumber) => ({ seasonNumber, episodeNumber }));
  }
  const sizes = seasons.get(target.tmdbId);
  if (!sizes) return null;
  // Episodes past TMDB's last season have not been listed there yet.
  return numbers.flatMap((n) => {
    const episode = placeAbsolute(n, sizes);
    return episode ? [episode] : [];
  });
}

function placeAbsolute(
  n: number,
  sizes: readonly SeasonSize[],
): { seasonNumber: number; episodeNumber: number } | null {
  let rest = n;
  for (const { seasonNumber, episodeCount } of sizes) {
    if (rest <= episodeCount) return { seasonNumber, episodeNumber: rest };
    rest -= episodeCount;
  }
  return null;
}
