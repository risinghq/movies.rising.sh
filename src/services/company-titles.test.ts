import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { resetDb } from "@/test/d1";
import { requestUrl } from "@/test/fetch";
import { addEntry, addMedia, addUser } from "@/test/fixtures";
import { listCompanyTitles } from "./company-titles";

vi.mock("void/env", () => ({ env: { TMDB_READ_ACCESS_TOKEN: "token" } }));

const fetchMock = vi.fn<typeof fetch>();

const discover: Record<string, unknown> = {
  "/3/discover/movie": {
    total_pages: 1,
    results: [{ id: 1, title: "Film", popularity: 5 }],
  },
  "/3/discover/tv": {
    total_pages: 3,
    results: [
      { id: 2, name: "Big Show", popularity: 9 },
      { id: 3, name: "Small Show", popularity: 1 },
    ],
  },
};

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => requestUrl(url).pathname);
}

beforeEach(async () => {
  await resetDb();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url) => Response.json(discover[requestUrl(url).pathname]));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listCompanyTitles", () => {
  it("merges a studio's movies and shows by popularity and marks the user's library", async () => {
    await addUser({ id: "u1" });
    const showId = await addMedia({ mediaType: "show", tmdbId: 2 });
    await addEntry({ userId: "u1", mediaId: showId });
    await addMedia({ mediaType: "show", tmdbId: 3 });

    const { titles, hasMore } = await listCompanyTitles({
      kind: "company",
      tmdbId: 7,
      filter: "all",
      page: 1,
      userId: "u1",
    });

    expect(titles.map((t) => [t.title, t.slug, t.cachedMediaId, t.inLibrary])).toEqual([
      ["Big Show", "show-2", showId, true],
      ["Film", "film-1", null, false],
      ["Small Show", "show-3", "tmdb:show:3", false],
    ]);
    expect(hasMore).toBe(true);
    const url = requestUrl(fetchMock.mock.calls[0]?.[0]);
    expect(url.searchParams.get("with_companies")).toBe("7");
  });

  it("asks a network for shows only", async () => {
    const { titles } = await listCompanyTitles({
      kind: "network",
      tmdbId: 1,
      filter: "all",
      page: 3,
      userId: null,
    });

    expect(requested()).toEqual(["/3/discover/tv"]);
    expect(requestUrl(fetchMock.mock.calls[0]?.[0]).searchParams.get("with_networks")).toBe("1");
    expect(titles.every((t) => !t.inLibrary)).toBe(true);
  });

  it("returns nothing for movies of a network without asking TMDB", async () => {
    const result = await listCompanyTitles({
      kind: "network",
      tmdbId: 1,
      filter: "movie",
      page: 1,
      userId: null,
    });

    expect(result).toEqual({ titles: [], hasMore: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
