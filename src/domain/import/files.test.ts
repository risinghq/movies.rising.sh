import { describe, expect, it } from "vite-plus/test";
import { findBatchDays } from "./batches";
import { matchFileScan, type FileScan } from "./files";
import { readImdb } from "./imdb";
import type { ImportMediaRef } from "./items";
import { readLetterboxd } from "./letterboxd";
import { localNoon, planImport, playKey, type ExistingLibrary } from "./plan";

const LB = "https://boxd.it";

const letterboxdExport = [
  {
    name: "letterboxd-user-2026/diary.csv",
    text: [
      "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date",
      `2026-11-02,Alien,1979,${LB}/log1,4.5,,,2026-11-01`,
      `2026-11-05,Alien,1979,${LB}/log2,,Yes,,2026-11-05`,
    ].join("\n"),
  },
  {
    name: "letterboxd-user-2026/watched.csv",
    text: [
      "Date,Name,Year,Letterboxd URI",
      `2026-11-02,Alien,1979,${LB}/alien`,
      `2020-01-01,Heat,1995,${LB}/heat`,
    ].join("\n"),
  },
  {
    name: "letterboxd-user-2026/ratings.csv",
    text: [
      "Date,Name,Year,Letterboxd URI,Rating",
      `2026-11-02,Alien,1979,${LB}/alien,4.5`,
      `2026-11-03,Heat,1995,${LB}/heat,0`,
    ].join("\n"),
  },
  {
    name: "letterboxd-user-2026/watchlist.csv",
    text: ["Date,Name,Year,Letterboxd URI", `2026-10-01,Dune,2021,${LB}/dune`].join("\n"),
  },
  {
    name: "letterboxd-user-2026/profile.csv",
    text: [
      "Username,Email Address,Favorite Films",
      `me,me@example.com,"${LB}/heat, ${LB}/dune"`,
    ].join("\n"),
  },
  {
    name: "letterboxd-user-2026/deleted/diary.csv",
    text: [
      "Date,Name,Year,Letterboxd URI,Watched Date",
      `2026-01-01,Gone,2000,${LB}/x,2026-01-01`,
    ].join("\n"),
  },
];

describe("readLetterboxd", () => {
  const scan = readLetterboxd(letterboxdExport);
  const named = (i: number) => scan.titles[i]?.title;

  it("gives each film one title, typed movie", () => {
    expect(scan.titles).toEqual([
      { title: "Alien", year: 1979, imdbId: null, mediaType: "movie" },
      { title: "Heat", year: 1995, imdbId: null, mediaType: "movie" },
      { title: "Dune", year: 2021, imdbId: null, mediaType: "movie" },
    ]);
  });

  it("dates diary plays, leaves watched-only films undated and ignores deleted/", () => {
    const plays = scan.entries.filter((e) => e.kind === "play");
    expect(plays.map((e) => [named(e.title), e.watchedOn])).toEqual([
      ["Alien", "2026-11-01"],
      ["Alien", "2026-11-05"],
      ["Heat", null],
    ]);
  });

  it("scales stars to 100, skipping an unrated row", () => {
    const ratings = scan.entries.filter((e) => e.kind === "rating");
    expect(ratings.map((e) => [named(e.title), e.score100, e.ratedOn])).toEqual([
      ["Alien", 90, "2026-11-02"],
    ]);
  });

  it("reads the watchlist and favorites by film URI", () => {
    const of = (kind: string) =>
      scan.entries.filter((e) => e.kind === kind).map((e) => named(e.title));
    expect(of("planned")).toEqual(["Dune"]);
    expect(of("favorite")).toEqual(["Heat", "Dune"]);
  });
});

describe("readImdb", () => {
  const ratings = {
    name: "ratings.csv",
    text: [
      "Const,Your Rating,Date Rated,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year",
      "tt0078748,8,2026-11-02,Alien,Alien,,Movie,8.5,117,1979",
      "tt7366338,10,2026-11-03,Chernobyl,Chernobyl,,TV Mini Series,9.3,330,2019",
      "tt0000001,7,2026-11-04,Pilot,Pilot,,TV Episode,8,45,2020",
    ].join("\n"),
  };
  const watchlist = {
    name: "watchlist.csv",
    text: [
      "Position,Const,Created,Modified,Description,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year",
      "1,tt0078748,2026-01-01,,,Alien,Alien,,movie,8.5,117,1979",
      "2,tt0903747,2026-01-01,,,Breaking Bad,Breaking Bad,,tvSeries,9.5,49,2008",
      "3,tt0000002,2026-01-01,,,Ep,Ep,,tvEpisode,8,45,2020",
      "4,tt0000003,2026-01-01,,,Clip,Clip,,Music Video,,,2020",
    ].join("\n"),
  };
  const scan = readImdb([ratings, watchlist]);

  it("keys titles by tt-id and folds title types", () => {
    expect(scan.titles.map((t) => [t.imdbId, t.mediaType])).toEqual([
      ["tt0078748", "movie"],
      ["tt7366338", "show"],
      ["tt0903747", "show"],
      ["tt0000003", null],
    ]);
  });

  it("reads ratings out of ten and list rows as planned", () => {
    expect(scan.entries).toEqual([
      { kind: "rating", title: 0, score100: 80, ratedOn: "2026-11-02" },
      { kind: "rating", title: 1, score100: 100, ratedOn: "2026-11-03" },
      { kind: "planned", title: 0 },
      { kind: "planned", title: 2 },
      { kind: "planned", title: 3 },
    ]);
  });

  it("skips episodes", () => {
    expect(scan.skipped).toEqual([
      { reason: "episode_rating", title: "Pilot" },
      { reason: "episode_listed", title: "Ep" },
    ]);
  });
});

describe("matchFileScan", () => {
  it("skips an unmatched title once, whatever its entries", () => {
    const scan: FileScan = {
      titles: [
        { title: "Alien", year: 1979, imdbId: null, mediaType: "movie" },
        { title: "Nothing", year: null, imdbId: null, mediaType: "movie" },
      ],
      entries: [
        { kind: "play", title: 0, watchedOn: "2026-11-01" },
        { kind: "play", title: 1, watchedOn: null },
        { kind: "planned", title: 1 },
        { kind: "rating", title: 0, score100: 90, ratedOn: "2026-11-02" },
      ],
      skipped: [],
    };
    const alien: ImportMediaRef = { mediaType: "movie", tmdbId: 348, title: "Alien" };
    expect(matchFileScan(scan, [alien, null])).toEqual({
      items: [
        { kind: "play", media: alien, episode: null, watchedAt: null, watchedOn: "2026-11-01" },
        { kind: "rating", media: alien, score100: 90, ratedAt: Date.parse("2026-11-02T12:00:00Z") },
      ],
      skipped: [{ reason: "no_match", title: "Nothing" }],
    });
  });
});

describe("day-only plays", () => {
  const alien: ImportMediaRef = { mediaType: "movie", tmdbId: 348, title: "Alien" };
  const items = Array.from({ length: 12 }, () => ({
    kind: "play" as const,
    media: alien,
    episode: null,
    watchedAt: null,
    watchedOn: "2026-11-01",
  }));
  const empty: ExistingLibrary = { playKeys: new Set(), entries: new Map(), favorites: new Set() };
  const context = { userId: "u1", importId: "imp1", timeZone: "America/New_York", now: 1000 };

  it("places the day at local noon", () => {
    expect(localNoon("2026-11-01", "America/New_York")).toBe(Date.parse("2026-11-01T17:00:00Z"));
    expect(localNoon("2026-11-01", null)).toBe(Date.parse("2026-11-01T12:00:00Z"));
  });

  it("are not read as a batch and keep their day", () => {
    expect(findBatchDays(items, context.timeZone)).toEqual([]);
    const plan = planImport(items.slice(0, 1), empty, context);
    expect(plan.plays.map((p) => p.watchedOn)).toEqual(["2026-11-01"]);
  });

  it("are duplicates on a second import", () => {
    const first = planImport(items.slice(0, 1), empty, context);
    const keys = new Set(
      first.plays.map((p) => playKey(p.mediaId, null, null, p.watchedAt ?? null)),
    );
    const again = planImport(items.slice(0, 1), { ...empty, playKeys: keys }, context);
    expect(again.plays).toEqual([]);
    expect(again.counts.duplicatePlays).toBe(1);
  });
});
