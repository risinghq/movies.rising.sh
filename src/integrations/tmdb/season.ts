import * as v from "valibot";
import { tmdbFetch } from "./client";
import { Id, NullNum, NullStr, looseArray, parse } from "./parse";
import type { EpisodeInput } from "@/shared/types/metadata";
import type { SeasonSize } from "@/domain/import/anilist";

const SeasonDetail = v.object({
  episodes: looseArray(
    v.object({
      episode_number: Id,
      name: NullStr,
      runtime: NullNum,
      air_date: NullStr,
    }),
  ),
});

export async function fetchSeasonEpisodes(
  tmdbId: number,
  seasonNumber: number,
): Promise<EpisodeInput[]> {
  return parseSeasonEpisodes(
    await tmdbFetch<unknown>(`/tv/${tmdbId}/season/${seasonNumber}`),
    seasonNumber,
  );
}

export function parseSeasonEpisodes(raw: unknown, seasonNumber: number): EpisodeInput[] {
  const season = parse(SeasonDetail, raw);
  return season.episodes.map((episode) => ({
    seasonNumber,
    episodeNumber: episode.episode_number,
    name: episode.name,
    runtime: episode.runtime,
    airDate: episode.air_date,
  }));
}

const ShowSeasons = v.object({
  seasons: looseArray(v.object({ season_number: Id, episode_count: NullNum })),
});

/** The regular seasons of a show in order, with their episode counts. */
export async function fetchShowSeasonSizes(tmdbId: number): Promise<SeasonSize[]> {
  return parseShowSeasonSizes(await tmdbFetch<unknown>(`/tv/${tmdbId}`));
}

export function parseShowSeasonSizes(raw: unknown): SeasonSize[] {
  return parse(ShowSeasons, raw)
    .seasons.filter((s) => s.season_number > 0)
    .map((s) => ({ seasonNumber: s.season_number, episodeCount: s.episode_count ?? 0 }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
}
