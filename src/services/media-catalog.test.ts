import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { resetDb } from "@/test/d1";
import { requestUrl } from "@/test/fetch";
import { findMediaByTmdbIds } from "@/domain/catalog/media";
import { cacheMediaBySlug } from "./media-catalog";

vi.mock("void/env", () => ({ env: { TMDB_READ_ACCESS_TOKEN: "token" } }));

const fetchMock = vi.fn<typeof fetch>();

const tmdb: Record<string, unknown> = {
  "/3/movie/5": { id: 5, title: "Some Film" },
  "/3/tv/5": { id: 5, name: "Digimon", number_of_seasons: 2, number_of_episodes: 40 },
};

beforeEach(async () => {
  await resetDb();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url) => {
    const body = tmdb[requestUrl(url).pathname];
    return body ? Response.json(body) : new Response("missing", { status: 404 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cacheMediaBySlug", () => {
  it("caches the media type whose slug matches", async () => {
    expect(await cacheMediaBySlug("digimon-5")).toBe("tmdb:show:5");

    const [row] = await findMediaByTmdbIds([{ mediaType: "show", tmdbId: 5 }]);
    expect(row).toMatchObject({ slug: "digimon-5", title: "Digimon", episodeCount: 40 });
  });

  it("caches nothing when no title has the slug", async () => {
    expect(await cacheMediaBySlug("another-name-5")).toBeNull();
    expect(await cacheMediaBySlug("no-id-here")).toBeNull();

    const rows = await findMediaByTmdbIds([
      { mediaType: "movie", tmdbId: 5 },
      { mediaType: "show", tmdbId: 5 },
    ]);
    expect(rows).toEqual([]);
  });

  it("caches nothing when TMDB knows neither id", async () => {
    expect(await cacheMediaBySlug("gone-9")).toBeNull();
  });
});
