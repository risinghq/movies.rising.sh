import { beforeEach, describe, expect, it } from "vite-plus/test";
import { runBatch } from "@/db/kernel";
import { resetDb } from "@/test/d1";
import {
  findMediaByTmdbIds,
  mediaStubsWrite,
  searchLocalMedia,
  upsertMediaFromTmdb,
} from "./media";

async function addMovies(count: number) {
  for (let tmdbId = 1; tmdbId <= count; tmdbId++) {
    await upsertMediaFromTmdb({
      mediaType: "movie",
      tmdbId,
      title: `Movie ${tmdbId}`,
      slug: `movie-${tmdbId}`,
      popularity: tmdbId,
    });
  }
}

beforeEach(resetDb);

describe("findMediaByTmdbIds", () => {
  it("finds more ids than one statement can bind", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => ({
      mediaType: "movie" as const,
      tmdbId: i + 1,
    }));
    await runBatch(mediaStubsWrite(ids.map((id) => ({ ...id, title: `Movie ${id.tmdbId}` }))));

    const rows = await findMediaByTmdbIds(ids);

    expect(rows).toHaveLength(250);
  });

  it("matches on media type as well as id", async () => {
    await addMovies(2);

    const rows = await findMediaByTmdbIds([
      { mediaType: "movie", tmdbId: 1 },
      { mediaType: "show", tmdbId: 2 },
    ]);

    expect(rows.map((row) => row.slug)).toEqual(["movie-1"]);
  });
});

describe("searchLocalMedia", () => {
  it("matches a title fragment, most popular first", async () => {
    await addMovies(12);

    const rows = await searchLocalMedia("movie 1", 5);

    expect(rows.map((row) => row.tmdbId)).toEqual([12, 11, 10, 1]);
  });
});
