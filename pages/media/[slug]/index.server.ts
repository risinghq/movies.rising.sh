import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { mediaHead } from "@/shared/head";
import { getUser } from "void/auth";
import { isMediaFavorited } from "@/domain/tracking/favorites";
import { findEntry } from "@/domain/tracking/library-entries";
import { hasWatch } from "@/domain/tracking/watch-events";
import { buildShowView } from "@/domain/tracking/show-view";
import type { SeasonEpisodes, SeasonSummary } from "@/domain/catalog/episodes";
import { userRatingSystem } from "@/domain/user";
import { loadMedia } from "@/services/media-hydration";
import { listMediaCompanies, listMediaGenres, listMediaTitles } from "@/domain/catalog/metadata";

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

async function loadViewerState(userId: string | null, item: MediaItem) {
  if (!userId) return { libraryEntry: null, isFavorited: false, movieWatched: false };
  const [entry, isFavorited, movieWatched] = await Promise.all([
    findEntry(userId, item.id),
    isMediaFavorited(userId, item.id),
    item.mediaType === "movie" ? hasWatch(userId, item.id) : Promise.resolve(false),
  ]);
  if (!entry.ok) throw new Error("failed to load library entry", { cause: entry.error });
  return { libraryEntry: entry.value, isFavorited, movieWatched };
}

export const loader = defineHandler(async (c) => {
  const user = getUser();

  const item = await loadMedia(c.req.param("slug") as string);
  if (!item) return c.notFound();

  // Every query below needs only the media row and the viewer, so they share one
  // round trip to D1.
  const [genres, companies, altTitles, show, viewer] = await Promise.all([
    listMediaGenres(item.id),
    listMediaCompanies(item.id),
    listMediaTitles(item.id),
    loadShow(user?.id ?? null, item),
    loadViewerState(user?.id ?? null, item),
  ]);
  const { libraryEntry, isFavorited, movieWatched } = viewer;
  const watchedEpisodeCount = movieWatched ? 1 : show.watchedEpisodeCount;
  const ratingSystem = userRatingSystem(user);

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

export const head = defineHead<Props>((_c, props) => mediaHead(props.media));
