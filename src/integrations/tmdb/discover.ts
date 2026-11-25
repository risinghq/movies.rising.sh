import * as v from "valibot";
import { tmdbFetch } from "./client";
import { NullNum, looseArray, parse } from "./parse";
import { TitleItem, isTitle, mapTitle, tmdbPath } from "./search";
import type { MediaType } from "@/domain/catalog/media";
import type { CompanyKind } from "@/shared/company";

const DiscoverPage = v.object({ total_pages: NullNum, results: looseArray(TitleItem) });

// TMDB stops paging discover results at page 500.
const MAX_PAGE = 500;

// A network filters shows only; a production company filters movies and shows.
export async function discoverCompanyTitles(input: {
  kind: CompanyKind;
  tmdbId: number;
  mediaType: MediaType;
  page: number;
}) {
  const filter = input.kind === "network" ? "with_networks" : "with_companies";
  const raw = await tmdbFetch<unknown>(`/discover/${tmdbPath(input.mediaType)}`, {
    [filter]: String(input.tmdbId),
    sort_by: "popularity.desc",
    include_adult: "false",
    page: String(input.page),
  });
  const parsed = parse(DiscoverPage, raw);
  return {
    results: parsed.results.map((item) => mapTitle(item, input.mediaType)).filter(isTitle),
    totalPages: Math.min(parsed.total_pages ?? 0, MAX_PAGE),
  };
}
