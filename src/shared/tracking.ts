import type { SeasonEpisodes, SeasonSummary } from "@/shared/catalog";
import type { HydrationState } from "@/shared/hydration";
import type { LibraryStatus } from "@/shared/library-status";

export type EpisodeRef = { seasonNumber: number; episodeNumber: number };

export function episodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}:${episodeNumber}`;
}

export function seasonName(seasonNumber: number): string {
  return seasonNumber === 0 ? "specials" : `season ${seasonNumber}`;
}

export function watchedBySeason(watchedKeys: readonly string[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const key of watchedKeys) {
    const seasonNumber = Number(key.slice(0, key.indexOf(":")));
    counts.set(seasonNumber, (counts.get(seasonNumber) ?? 0) + 1);
  }
  return counts;
}

// A show opens on the season the viewer is in: the first regular season with
// an unwatched episode. Specials (season 0) open only when nothing else exists.
export function openingSeason(
  seasons: readonly SeasonSummary[],
  watchedKeys: readonly string[],
): number | null {
  const counts = watchedBySeason(watchedKeys);
  const regular = seasons.filter((s) => s.seasonNumber !== 0);
  const current = regular.find((s) => (counts.get(s.seasonNumber) ?? 0) < s.episodeCount);
  return (current ?? regular[0] ?? seasons[0])?.seasonNumber ?? null;
}

export type MediaSearchCandidate = {
  mediaType: "movie" | "show";
  tmdbId: number;
  title: string;
  slug: string;
  originalTitle?: string | null;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  voteCount?: number | null;
  popularity?: number | null;
  cachedMediaId?: string | null;
};

export type MediaRef = string | MediaSearchCandidate;

export type TrackedEntryDto = {
  id: string;
  filedStatus: LibraryStatus;
  score100: number | null;
  updatedAt: number;
};

export type ShowProgressDto = {
  watchedEpisodeCount: number;
  airedEpisodeCount: number | null;
  nextEpisode: EpisodeRef | null;
  complete: boolean;
};

// Long shows run past a thousand episodes, so the view carries the episodes of
// the opening season only. The client loads another season when it is picked.
export type ShowViewDto = {
  seasons: SeasonSummary[];
  openSeason: SeasonEpisodes | null;
  seasonCount: number | null;
  episodeCount: number | null;
  watchedKeys: string[];
  progress: ShowProgressDto;
  hydrationState: HydrationState;
  episodesError: string | null;
};
