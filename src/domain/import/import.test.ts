import { describe, expect, it } from "vite-plus/test";
import type { LibraryEntryRecord } from "@/domain/tracking/library-entries";
import { findBatchDays, undateBatchDays } from "./batches";
import type { ImportItem, ImportMediaRef } from "./items";
import { planImport, playKey, type ExistingLibrary } from "./plan";
import { readTrakt } from "./trakt";

const movie: ImportMediaRef = { mediaType: "movie", tmdbId: 710, title: "GoldenEye" };
const show: ImportMediaRef = { mediaType: "show", tmdbId: 87108, title: "Chernobyl" };

const at = (iso: string) => Date.parse(iso);
const play = (media: ImportMediaRef, watchedAt: number | null, episode = 1): ImportItem => ({
  kind: "play",
  media,
  episode: media.mediaType === "show" ? { seasonNumber: 1, episodeNumber: episode } : null,
  watchedAt,
});

const empty: ExistingLibrary = { playKeys: new Set(), entries: new Map(), favorites: new Set() };
const context = { userId: "u1", importId: "imp1", timeZone: null, now: 1000 };

describe("readTrakt", () => {
  const ids = (tmdb: number) => ({ ids: { tmdb, trakt: 1 } });

  it("maps history, ratings, watchlist, favorites and dropped shows", () => {
    const scan = readTrakt({
      history: [
        {
          watched_at: "2026-11-22T03:41:00.000Z",
          type: "movie",
          movie: { title: "GoldenEye", ...ids(710) },
        },
        {
          watched_at: "2024-08-14T14:17:00.000Z",
          type: "episode",
          episode: { season: 1, number: 2 },
          show: { title: "Chernobyl", ...ids(87108) },
        },
      ],
      ratings: [
        {
          rated_at: "2026-11-22T14:56:49.000Z",
          rating: 8,
          type: "movie",
          movie: { title: "GoldenEye", ...ids(710) },
        },
        {
          rated_at: "2026-09-07T01:42:04.000Z",
          rating: 8,
          type: "episode",
          show: { title: "Chernobyl" },
        },
      ],
      watchlist: [
        { type: "season", season: {} },
        { type: "show", show: { title: "Chernobyl", ...ids(87108) } },
      ],
      favorites: [
        { type: "show", notes: " Things feel real. ", show: { title: "Chernobyl", ...ids(87108) } },
      ],
      dropped: [{ type: "show", show: { title: "Lost", ids: { tmdb: null } } }],
    });

    expect(scan.items).toEqual([
      { kind: "play", media: movie, episode: null, watchedAt: at("2026-11-22T03:41:00.000Z") },
      {
        kind: "play",
        media: show,
        episode: { seasonNumber: 1, episodeNumber: 2 },
        watchedAt: at("2024-08-14T14:17:00.000Z"),
      },
      { kind: "rating", media: movie, score100: 80, ratedAt: at("2026-11-22T14:56:49.000Z") },
      { kind: "planned", media: show },
      { kind: "favorite", media: show, note: "Things feel real." },
    ]);
    expect(scan.skipped).toEqual([
      { reason: "episode_rating", title: "Chernobyl" },
      { reason: "no_tmdb_id", title: "Lost" },
    ]);
  });
});

describe("batches", () => {
  const minute = at("2024-08-14T14:17:00.000Z");
  const backfill = Array.from({ length: 20 }, (_, i) => play(show, minute + (i % 2) * 1000, i + 1));
  const season = Array.from({ length: 5 }, (_, i) =>
    play(show, at("2025-01-03T20:00:00.000Z"), i + 1),
  );
  const single = play(movie, at("2025-01-04T21:00:00.000Z"));
  const items = [...backfill, ...season, single];

  it("finds days of plays marked at once and defaults big ones to undated", () => {
    expect(findBatchDays(items, null)).toEqual([
      { day: "2024-08-14", plays: 20, undatedByDefault: true },
      { day: "2025-01-03", plays: 5, undatedByDefault: false },
    ]);
  });

  it("clears the date of batched plays on the chosen days only", () => {
    const result = undateBatchDays(items, new Set(["2024-08-14", "2025-01-04"]), null);
    const undated = result.filter((item) => item.kind === "play" && item.watchedAt === null);
    expect(undated).toHaveLength(20);
    expect(result.at(-1)).toEqual(single);
  });
});

describe("planImport", () => {
  it("creates entries, plays and favorites, and skips duplicate plays", () => {
    const watchedAt = at("2026-11-22T03:41:00.000Z");
    const existing: ExistingLibrary = {
      ...empty,
      playKeys: new Set([playKey("tmdb:movie:710", null, null, watchedAt)]),
    };
    const plan = planImport(
      [
        play(movie, watchedAt),
        play(movie, at("2025-01-01T00:00:00.000Z")),
        play(show, null),
        play(show, null),
        { kind: "favorite", media: show, note: "Real." },
      ],
      existing,
      context,
    );

    expect(plan.plays.map((p) => [p.mediaId, p.watchedOn, p.importId])).toEqual([
      ["tmdb:movie:710", "2025-01-01", "imp1"],
      ["tmdb:show:87108", null, "imp1"],
    ]);
    expect(plan.entries.map((e) => [e.mediaId, e.filedStatus, e.notes])).toEqual([
      ["tmdb:movie:710", "planned", null],
      ["tmdb:show:87108", "planned", "Real."],
    ]);
    expect(plan.favorites.map((f) => f.mediaId)).toEqual(["tmdb:show:87108"]);
    expect(plan.counts).toMatchObject({
      plays: 2,
      undatedPlays: 1,
      duplicatePlays: 2,
      favorites: 1,
    });
  });

  it("takes the latest imported score and files rated titles without plays as seen", () => {
    const plan = planImport(
      [
        { kind: "rating", media: movie, score100: 60, ratedAt: 1 },
        { kind: "rating", media: movie, score100: 90, ratedAt: 2 },
        { kind: "rating", media: show, score100: 70, ratedAt: 1 },
        { kind: "dropped", media: show },
      ],
      empty,
      context,
    );
    expect(plan.entries.map((e) => [e.mediaId, e.filedStatus, e.score100])).toEqual([
      ["tmdb:movie:710", "completed", 90],
      ["tmdb:show:87108", "dropped", 70],
    ]);
  });

  it("keeps the user's own score, notes and filed status", () => {
    const prev: LibraryEntryRecord = {
      id: "e1",
      userId: "u1",
      mediaId: "tmdb:movie:710",
      filedStatus: "paused",
      score100: 40,
      notes: "mine",
      importId: null,
      createdAt: 1,
      updatedAt: 1,
    };
    const plan = planImport(
      [
        { kind: "rating", media: movie, score100: 90, ratedAt: 5 },
        { kind: "favorite", media: movie, note: "theirs" },
        { kind: "dropped", media: movie },
      ],
      { ...empty, entries: new Map([[prev.mediaId, prev]]) },
      context,
    );
    expect(plan.entries).toEqual([]);
    expect(plan.counts).toMatchObject({ scoresKept: 1, entriesUpdated: 0 });
  });

  it("raises a planned entry and fills an empty score", () => {
    const prev: LibraryEntryRecord = {
      id: "e1",
      userId: "u1",
      mediaId: "tmdb:movie:710",
      filedStatus: "planned",
      score100: null,
      notes: null,
      importId: null,
      createdAt: 1,
      updatedAt: 1,
    };
    const plan = planImport(
      [{ kind: "rating", media: movie, score100: 90, ratedAt: 5 }],
      { ...empty, entries: new Map([[prev.mediaId, prev]]) },
      context,
    );
    expect(plan.entries).toEqual([
      { ...prev, filedStatus: "completed", score100: 90, updatedAt: 1000 },
    ]);
    expect(plan.counts).toMatchObject({ scores: 1, entriesUpdated: 1, entriesCreated: 0 });
  });
});
