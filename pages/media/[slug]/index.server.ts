import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { isMediaFavorited } from "@/domain/tracking/favorites";
import { findEntry, type LibraryEntryRecord } from "@/domain/tracking/library-entries";
import { hasWatch } from "@/domain/tracking/watch-events";
import { buildShowView } from "@/domain/tracking/show-view";
import type { SeasonEpisodes, SeasonSummary } from "@/domain/catalog/episodes";
import { getUserSettings } from "@/domain/user";
import { loadMedia } from "@/services/media-hydration";
import { listMediaCompanies, listMediaGenres, listMediaTitles } from "@/domain/catalog/metadata";
import type { RatingSystem } from "@/domain/rating";

export type Props = InferProps<typeof loader>;

type MediaItem = NonNullable<Awaited<ReturnType<typeof loadMedia>>>;

// Episode picker data is public; watched marks are per-user.
async function loadShow(userId: string | null, item: MediaItem) {
  if (item.mediaType !== "show") {
    return {
      seasons: [] as SeasonSummary[],
      openSeason: null as SeasonEpisodes | null,
      watchedEpisodeKeys: [] as string[],
      watchedEpisodeCount: 0,
    };
  }
  const view = await buildShowView(userId, item);
  return {
    seasons: view.seasons,
    openSeason: view.openSeason,
    watchedEpisodeKeys: view.watchedKeys,
    watchedEpisodeCount: view.progress.watchedEpisodeCount,
  };
}

export const loader = defineHandler(async (c) => {
  const user = getUser();

  const item = await loadMedia(c.req.param("slug") as string);
  if (!item) return c.notFound();

  const [genres, companies, altTitles] = await Promise.all([
    listMediaGenres(item.id),
    listMediaCompanies(item.id),
    listMediaTitles(item.id),
  ]);

  const show = await loadShow(user?.id ?? null, item);
  let watchedEpisodeCount = show.watchedEpisodeCount;
  let libraryEntry: LibraryEntryRecord | null = null;
  let isFavorited = false;
  let ratingSystem: RatingSystem = "score100";

  if (user) {
    const [entry, favorited, settings, movieWatched] = await Promise.all([
      findEntry(user.id, item.id),
      isMediaFavorited(user.id, item.id),
      getUserSettings(user.id),
      item.mediaType === "movie" ? hasWatch(user.id, item.id) : Promise.resolve(false),
    ]);
    if (!entry.ok) throw new Error("failed to load library entry", { cause: entry.error });
    libraryEntry = entry.value;
    isFavorited = favorited;
    ratingSystem = settings.ratingSystem;
    if (item.mediaType === "movie" && movieWatched) watchedEpisodeCount = 1;
  }

  return {
    media: item,
    genres,
    companies,
    altTitles,
    seasons: show.seasons,
    openSeason: show.openSeason,
    libraryEntry,
    watchedEpisodeCount,
    watchedEpisodeKeys: show.watchedEpisodeKeys,
    isFavorited,
    user: user ?? null,
    ratingSystem,
  };
});
