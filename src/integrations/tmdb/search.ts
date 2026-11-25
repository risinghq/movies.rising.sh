import * as v from "valibot";
import { slugify } from "@/shared/slug";
import { tmdbFetch } from "./client";
import { Id, NonEmptyStr, NullNum, NullStr, looseArray, parse } from "./parse";
import type { MediaType } from "@/domain/catalog/media";

export type TmdbMediaResult = {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  seasonCount: number | null;
  episodeCount: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  slug: string;
};

// The fields a search hit, a discover row and a title lookup share. A row
// missing its id drops at parse.
const titleFields = {
  id: Id,
  title: NullStr,
  name: NullStr,
  original_title: NullStr,
  original_name: NullStr,
  overview: NullStr,
  poster_path: NullStr,
  backdrop_path: NullStr,
  release_date: NullStr,
  first_air_date: NullStr,
  vote_average: NullNum,
  vote_count: NullNum,
  popularity: NullNum,
};
export const TitleItem = v.object(titleFields);
type TitleItemPayload = v.InferOutput<typeof TitleItem>;

export type TmdbPersonResult = {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  knownForDepartment: string | null;
  /** Up to two of the titles TMDB lists the person as known for. */
  knownFor: string[];
  slug: string;
};

// /search/multi mixes titles and people in one ranked list. Each schema keeps
// its own kind; the other kind's rows drop at parse.
const TitleHit = v.object({ ...titleFields, media_type: v.picklist(["movie", "tv"]) });
const PersonHit = v.object({
  id: Id,
  media_type: v.literal("person"),
  name: NonEmptyStr,
  profile_path: NullStr,
  known_for_department: NullStr,
  known_for: looseArray(v.object({ title: NullStr, name: NullStr })),
});
const MultiSearch = v.object({ results: looseArray(v.union([TitleHit, PersonHit])) });

function mapPerson(item: v.InferOutput<typeof PersonHit>): TmdbPersonResult {
  return {
    tmdbId: item.id,
    name: item.name,
    profilePath: item.profile_path,
    knownForDepartment: item.known_for_department,
    knownFor: item.known_for
      .map((t) => t.title ?? t.name)
      .filter((t): t is string => t !== null)
      .slice(0, 2),
    slug: slugify(item.name, item.id),
  };
}

export function mapTitle(item: TitleItemPayload, mediaType: MediaType): TmdbMediaResult | null {
  const title = item.title ?? item.name;
  if (!title) return null;

  return {
    mediaType,
    tmdbId: item.id,
    title,
    originalTitle: item.original_title ?? item.original_name,
    overview: item.overview,
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    releaseDate: item.release_date ?? item.first_air_date,
    seasonCount: null,
    episodeCount: null,
    voteAverage: item.vote_average,
    voteCount: item.vote_count,
    popularity: item.popularity,
    slug: slugify(title, item.id),
  };
}

export function isTitle(item: TmdbMediaResult | null): item is TmdbMediaResult {
  return item !== null;
}

export function tmdbPath(mediaType: MediaType): "movie" | "tv" {
  return mediaType === "show" ? "tv" : "movie";
}

export type TmdbSearch = { titles: TmdbMediaResult[]; people: TmdbPersonResult[] };

/** One /search/multi page, split into titles and people in TMDB's rank order. */
export async function searchTmdb(input: { query: string; limit?: number }): Promise<TmdbSearch> {
  const query = input.query.trim();
  if (!query) return { titles: [], people: [] };

  const pageSize = Math.min(Math.max(input.limit ?? 20, 1), 20);
  const raw = await tmdbFetch<unknown>("/search/multi", {
    query,
    include_adult: "false",
    page: "1",
  });

  const titles: TmdbMediaResult[] = [];
  const people: TmdbPersonResult[] = [];
  for (const item of parse(MultiSearch, raw).results) {
    if (item.media_type === "person") people.push(mapPerson(item));
    else {
      const title = mapTitle(item, item.media_type === "tv" ? "show" : "movie");
      if (title) titles.push(title);
    }
  }
  return { titles: titles.slice(0, pageSize), people: people.slice(0, pageSize) };
}

const ShowTotals = v.object({ number_of_seasons: NullNum, number_of_episodes: NullNum });

export async function fetchTmdbShowTotals(input: { tmdbId: number }) {
  const raw = await tmdbFetch<unknown>(`/tv/${input.tmdbId}`);
  const totals = parse(ShowTotals, raw);
  return {
    seasonCount: totals.number_of_seasons,
    episodeCount: totals.number_of_episodes,
  };
}

export async function fetchTmdbTitle(input: { mediaType: MediaType; tmdbId: number }) {
  const raw = await tmdbFetch<unknown>(`/${tmdbPath(input.mediaType)}/${input.tmdbId}`);
  return mapTitle(parse(TitleItem, raw), input.mediaType);
}
