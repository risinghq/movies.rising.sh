import { findMediaByTmdbIds, type MediaType } from "@/domain/catalog/media";
import { libraryMediaIds } from "@/domain/tracking/library-entries";
import { discoverCompanyTitles } from "@/integrations/tmdb";
import type { MediaSearchResult } from "@/services/media-catalog";
import type { CompanyFilter, CompanyKind } from "@/shared/company";

export type CompanyTitle = MediaSearchResult & { inLibrary: boolean };

function companyMediaTypes(kind: CompanyKind, filter: CompanyFilter): MediaType[] {
  const types: MediaType[] = kind === "network" ? ["show"] : ["movie", "show"];
  return filter === "all" ? types : types.filter((t) => t === filter);
}

// One page asks TMDB for the same page number of each media type and merges
// them by popularity, so a studio page holds up to 20 movies and 20 shows.
export async function listCompanyTitles(input: {
  kind: CompanyKind;
  tmdbId: number;
  filter: CompanyFilter;
  page: number;
  userId: string | null;
}): Promise<{ titles: CompanyTitle[]; hasMore: boolean }> {
  const pages = await Promise.all(
    companyMediaTypes(input.kind, input.filter).map((mediaType) =>
      discoverCompanyTitles({
        kind: input.kind,
        tmdbId: input.tmdbId,
        mediaType,
        page: input.page,
      }),
    ),
  );
  const results = pages
    .flatMap((p) => p.results)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  const cached = await findMediaByTmdbIds(results);
  const rowByKey = new Map(cached.map((row) => [`${row.mediaType}:${row.tmdbId}`, row]));
  const inLibrary = input.userId
    ? await libraryMediaIds(
        input.userId,
        cached.map((row) => row.id),
      )
    : new Set<string>();

  return {
    titles: results.map((item) => {
      const row = rowByKey.get(`${item.mediaType}:${item.tmdbId}`);
      return {
        ...item,
        slug: row?.slug ?? item.slug,
        cachedMediaId: row?.id ?? null,
        inLibrary: row ? inLibrary.has(row.id) : false,
      };
    }),
    hasMore: pages.some((p) => input.page < p.totalPages),
  };
}
