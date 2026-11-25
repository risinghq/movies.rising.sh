import type { MediaRecord } from "@/domain/catalog/media";
import { listSeasonEpisodes, listSeasonSummaries } from "@/domain/catalog/episodes";
import { EPISODES_TTL_MS, hydrationState } from "@/domain/hydration";
import { deriveShowProgress, loadShowEpisodes, resolveWatchedEpisodes } from "./progress";
import { episodeKey, type ShowProgressDto, type ShowViewDto } from "@/shared/tracking";

const EMPTY_PROGRESS: ShowProgressDto = {
  watchedEpisodeCount: 0,
  airedEpisodeCount: null,
  nextEpisode: null,
  complete: false,
};

export async function buildShowView(
  userId: string | null,
  media: MediaRecord,
): Promise<ShowViewDto> {
  const seasons = await listSeasonSummaries(media.id);
  const first = seasons[0];
  const firstSeason = first
    ? {
        seasonNumber: first.seasonNumber,
        episodes: await listSeasonEpisodes(media.id, first.seasonNumber),
      }
    : null;

  let watchedKeys: string[] = [];
  let progress = EMPTY_PROGRESS;

  if (userId) {
    const { watched, aired, provisionalCount } = await loadShowEpisodes(userId, media.id);
    const derived = deriveShowProgress(watched, aired, provisionalCount);
    watchedKeys = resolveWatchedEpisodes(watched, aired, provisionalCount).map((episode) =>
      episodeKey(episode.seasonNumber, episode.episodeNumber),
    );
    progress = {
      watchedEpisodeCount: derived.watchedEpisodeCount,
      airedEpisodeCount: derived.airedEpisodeCount,
      nextEpisode: derived.nextEpisode,
      complete: derived.allAiredWatched,
    };
  }

  return {
    seasons,
    firstSeason,
    seasonCount: media.seasonCount,
    episodeCount: media.episodeCount,
    watchedKeys,
    progress,
    hydrationState: hydrationState(media.episodesHydratedAt, media.episodesError, EPISODES_TTL_MS),
    episodesError: media.episodesError,
  };
}
