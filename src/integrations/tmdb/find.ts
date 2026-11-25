import * as v from "valibot";
import type { MediaType } from "@/domain/catalog/media";
import { tmdbFetch } from "./client";
import { Id, NullStr, looseArray, parse } from "./parse";

export type TmdbMatch = { mediaType: MediaType; tmdbId: number; title: string };

const Hit = v.object({
  id: Id,
  title: NullStr,
  name: NullStr,
  original_title: NullStr,
  original_name: NullStr,
  release_date: NullStr,
  first_air_date: NullStr,
});
type HitPayload = v.InferOutput<typeof Hit>;

const FindResult = v.object({ movie_results: looseArray(Hit), tv_results: looseArray(Hit) });

// The TMDB title for an IMDb tt-id. A tt-id names one title, so the hit is
// exact; `prefer` decides only when TMDB returns both a movie and a show.
export async function findTmdbByImdbId(
  imdbId: string,
  prefer: MediaType | null,
): Promise<TmdbMatch | null> {
  const raw = await tmdbFetch<unknown>(`/find/${encodeURIComponent(imdbId)}`, {
    external_source: "imdb_id",
  });
  const found = parse(FindResult, raw);
  const movie = found.movie_results[0];
  const show = found.tv_results[0];
  if (movie && (prefer !== "show" || !show)) return toMatch("movie", movie);
  return show ? toMatch("show", show) : null;
}

const SearchResult = v.object({ results: looseArray(Hit) });

// The TMDB title for a name and year, as a file export without ids gives them.
// Release years differ between sites by a year now and then (festival against
// theatrical), so a miss on the exact year retries without it and accepts a
// hit one year off.
export async function searchTmdbTitle(
  title: string,
  year: number | null,
  mediaType: MediaType,
): Promise<TmdbMatch | null> {
  const path = mediaType === "show" ? "/search/tv" : "/search/movie";
  const yearParam = mediaType === "show" ? "first_air_date_year" : "primary_release_year";
  const search = async (params: Record<string, string>) =>
    parse(
      SearchResult,
      await tmdbFetch<unknown>(path, { query: title, include_adult: "false", ...params }),
    ).results;

  if (year !== null) {
    const exact = await search({ [yearParam]: String(year) });
    const hit = pick(exact, title);
    if (hit) return toMatch(mediaType, hit);
  }
  const loose = (await search({})).filter(
    (hit) => year === null || Math.abs((releaseYear(hit) ?? Infinity) - year) <= 1,
  );
  const hit = pick(loose, title);
  return hit ? toMatch(mediaType, hit) : null;
}

// TMDB ranks by relevance and popularity; a hit whose name matches exactly
// goes first, which keeps a remake from winning over the original.
function pick(hits: HitPayload[], title: string): HitPayload | null {
  const wanted = fold(title);
  const named = (hit: HitPayload) =>
    [hit.title, hit.name, hit.original_title, hit.original_name].some(
      (name) => name !== null && fold(name) === wanted,
    );
  return hits.find(named) ?? hits[0] ?? null;
}

function fold(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function releaseYear(hit: HitPayload): number | null {
  const year = Number((hit.release_date ?? hit.first_air_date ?? "").slice(0, 4));
  return year > 0 ? year : null;
}

function toMatch(mediaType: MediaType, hit: HitPayload): TmdbMatch | null {
  const title = hit.title ?? hit.name;
  return title ? { mediaType, tmdbId: hit.id, title } : null;
}
