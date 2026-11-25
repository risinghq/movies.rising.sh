import type { MediaRecord } from "@/domain/catalog/media";
import { listSeasonEpisodes, listSeasonSummaries } from "@/domain/catalog/episodes";
import { EPISODES_TTL_MS, hydrationState } from "@/domain/hydration";
import { deriveShowProgress, loadShowEpisodes, resolveWatchedEpisodes } from "./progress";
import {
  episodeKey,
  openingSeason,
  type ShowProgressDto,
  type ShowViewDto,
} from "@/shared/tracking";

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
  const [seasons, episodes] = await Promise.all([
    listSeasonSummaries(media.id),
    userId ? loadShowEpisodes(userId, media.id) : null,
  ]);
  let watchedKeys: string[] = [];
  let progress = EMPTY_PROGRESS;

  if (episodes) {
    const { watched, aired, provisionalCount } = episodes;
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

  const opening = openingSeason(seasons, watchedKeys);
  const openSeason =
    opening === null
      ? null
      : { seasonNumber: opening, episodes: await listSeasonEpisodes(media.id, opening) };

  return {
    seasons,
    openSeason,
    seasonCount: media.seasonCount,
    episodeCount: media.episodeCount,
    watchedKeys,
    progress,
    hydrationState: hydrationState(media.episodesHydratedAt, media.episodesError, EPISODES_TTL_MS),
    episodesError: media.episodesError,
  };
}
