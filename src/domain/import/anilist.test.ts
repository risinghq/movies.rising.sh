import { describe, expect, it } from "vite-plus/test";
import {
  readAnilist,
  showsNeedingSeasons,
  type AnilistEntry,
  type AnilistExport,
  type AnilistTarget,
} from "./anilist";

function entry(mediaId: number, overrides: Partial<AnilistEntry> = {}): AnilistEntry {
  return {
    mediaId,
    title: `Title ${mediaId}`,
    status: "COMPLETED",
    progress: 0,
    episodes: null,
    score100: 0,
    updatedAt: 1_700_000_000,
    completedOn: null,
    ...overrides,
  };
}

function exported(entries: AnilistEntry[], extra: Partial<AnilistExport> = {}): AnilistExport {
  return { entries, favorites: [], truncated: [], ...extra };
}

const MAPPING = new Map<number, AnilistTarget>([
  [1, { kind: "movie", tmdbId: 500 }],
  [2, { kind: "show", tmdbId: 900, season: 3, offset: 12 }],
  [3, { kind: "show", tmdbId: 700, season: null, offset: 0 }],
  [4, { kind: "show", tmdbId: 900, season: 1, offset: 0 }],
]);
const NO_SEASONS = new Map();

function episodes(scan: ReturnType<typeof readAnilist>, tmdbId: number) {
  return scan.items.flatMap((item) =>
    item.kind === "play" && item.media.tmdbId === tmdbId && item.episode ? [item.episode] : [],
  );
}

describe("readAnilist", () => {
  it("dates a finished movie by its completion day", () => {
    const scan = readAnilist(
      exported([entry(1, { completedOn: "2026-09-17" })]),
      MAPPING,
      NO_SEASONS,
    );
    expect(scan.items).toEqual([
      {
        kind: "play",
        media: { mediaType: "movie", tmdbId: 500, title: "Title 1" },
        episode: null,
        watchedAt: null,
        watchedOn: "2026-09-17",
      },
    ]);
  });

  it("places a cour's episodes after the offset of its TMDB season", () => {
    const scan = readAnilist(
      exported([entry(2, { status: "CURRENT", progress: 3, episodes: 10 })]),
      MAPPING,
      NO_SEASONS,
    );
    expect(episodes(scan, 900)).toEqual([
      { seasonNumber: 3, episodeNumber: 13 },
      { seasonNumber: 3, episodeNumber: 14 },
      { seasonNumber: 3, episodeNumber: 15 },
    ]);
    expect(scan.items.every((item) => item.kind === "play" && item.watchedAt === null)).toBe(true);
  });

  it("marks every episode of a completed series watched", () => {
    const scan = readAnilist(
      exported([entry(4, { progress: 0, episodes: 2 })]),
      MAPPING,
      NO_SEASONS,
    );
    expect(episodes(scan, 900)).toHaveLength(2);
  });

  it("splits absolute episode numbers over TMDB's seasons", () => {
    const seasons = new Map([
      [
        700,
        [
          { seasonNumber: 1, episodeCount: 2 },
          { seasonNumber: 2, episodeCount: 2 },
        ],
      ],
    ]);
    const scan = readAnilist(
      exported([entry(3, { status: "CURRENT", progress: 5 })]),
      MAPPING,
      seasons,
    );
    expect(episodes(scan, 700)).toEqual([
      { seasonNumber: 1, episodeNumber: 1 },
      { seasonNumber: 1, episodeNumber: 2 },
      { seasonNumber: 2, episodeNumber: 1 },
      { seasonNumber: 2, episodeNumber: 2 },
    ]);
  });

  it("reports a show TMDB could not count as unmatched", () => {
    const scan = readAnilist(
      exported([entry(3, { status: "CURRENT", progress: 5 })]),
      MAPPING,
      NO_SEASONS,
    );
    expect(scan.items).toEqual([]);
    expect(scan.skipped).toEqual([{ reason: "no_match", title: "Title 3" }]);
  });

  it("keeps planned and dropped titles with the episodes seen before dropping", () => {
    const scan = readAnilist(
      exported([entry(1, { status: "PLANNING" }), entry(2, { status: "DROPPED", progress: 1 })]),
      MAPPING,
      NO_SEASONS,
    );
    expect(scan.items.map((item) => item.kind)).toEqual(["planned", "play", "dropped"]);
  });

  it("gives a show the mean score of its rated seasons", () => {
    const scan = readAnilist(
      exported([
        entry(2, { status: "PAUSED", score100: 80, updatedAt: 10 }),
        entry(4, { status: "PAUSED", score100: 91, updatedAt: 20 }),
        entry(1, { status: "PLANNING", score100: 0 }),
      ]),
      MAPPING,
      NO_SEASONS,
    );
    expect(scan.items.filter((item) => item.kind === "rating")).toEqual([
      {
        kind: "rating",
        media: { mediaType: "show", tmdbId: 900, title: "Title 2" },
        score100: 86,
        ratedAt: 20_000,
      },
    ]);
  });

  it("drops a repeated episode two titles map onto", () => {
    const scan = readAnilist(
      exported([entry(4, { episodes: 1 }), entry(4, { episodes: 1 })]),
      MAPPING,
      NO_SEASONS,
    );
    expect(episodes(scan, 900)).toHaveLength(1);
  });

  it("skips unmapped titles and reports cut lists", () => {
    const scan = readAnilist(
      exported([entry(99)], {
        favorites: [
          { mediaId: 1, title: "Fav" },
          { mediaId: 98, title: "Lost" },
        ],
        truncated: ["Favourites"],
      }),
      MAPPING,
      NO_SEASONS,
    );
    expect(scan.items).toEqual([
      {
        kind: "favorite",
        media: { mediaType: "movie", tmdbId: 500, title: "Fav" },
        note: null,
      },
    ]);
    expect(scan.skipped).toEqual([
      { reason: "no_tmdb_id", title: "Title 99" },
      { reason: "no_tmdb_id", title: "Lost" },
      { reason: "list_truncated", title: "Favourites" },
    ]);
  });
});

describe("showsNeedingSeasons", () => {
  it("lists only watched shows mapped without a season", () => {
    const data = exported([
      entry(3, { status: "CURRENT", progress: 2 }),
      entry(3, { status: "PLANNING" }),
      entry(2, { status: "CURRENT", progress: 2 }),
    ]);
    expect(showsNeedingSeasons(data, MAPPING)).toEqual([700]);
  });
});
