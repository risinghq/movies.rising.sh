import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { MAX_REQUESTS, fetchAnilistExport } from "./client";
import { fetchAnilistMapping } from "./mapping";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(handler: (body: unknown) => Response) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async (_url, init) => handler(typeof init?.body === "string" ? JSON.parse(init.body) : null),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const title = { english: null, romaji: "Romaji" };

function listEntry(id: number) {
  return {
    status: "COMPLETED",
    progress: 12,
    score: 85,
    updatedAt: 100,
    completedAt: { year: 2026, month: 3, day: 7 },
    media: { id, episodes: 12, title },
  };
}

describe("fetchAnilistExport", () => {
  it("reads chunks and favourite pages until both end, skipping custom lists", async () => {
    const fetchMock = stubFetch((body) => {
      const { chunk, list, favs } = (body as { variables: Record<string, unknown> }).variables;
      return Response.json({
        data: {
          ...(list
            ? {
                MediaListCollection: {
                  hasNextChunk: chunk === 1,
                  lists: [
                    { isCustomList: false, entries: [listEntry(Number(chunk))] },
                    { isCustomList: true, entries: [listEntry(77)] },
                  ],
                },
              }
            : {}),
          ...(favs
            ? {
                User: {
                  favourites: {
                    anime: { pageInfo: { hasNextPage: false }, nodes: [{ id: 5, title }] },
                  },
                },
              }
            : {}),
        },
      });
    });

    const data = await fetchAnilistExport("ada");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(data).toEqual({
      entries: [1, 2].map((mediaId) => ({
        mediaId,
        title: "Romaji",
        status: "COMPLETED",
        progress: 12,
        episodes: 12,
        score100: 85,
        updatedAt: 100,
        completedOn: "2026-03-07",
      })),
      favorites: [{ mediaId: 5, title: "Romaji" }],
      truncated: [],
    });
  });

  it("returns null for a name with no public profile", async () => {
    stubFetch(() =>
      Response.json(
        {
          errors: [{ message: "User not found" }],
          data: { MediaListCollection: null, User: null },
        },
        { status: 404 },
      ),
    );
    expect(await fetchAnilistExport("nobody")).toBeNull();
  });

  it("stops at the request budget and names the cut lists", async () => {
    const fetchMock = stubFetch(() =>
      Response.json({
        data: {
          MediaListCollection: { hasNextChunk: true, lists: [] },
          User: { favourites: { anime: { pageInfo: { hasNextPage: true }, nodes: [] } } },
        },
      }),
    );
    const data = await fetchAnilistExport("hoarder");
    expect(fetchMock).toHaveBeenCalledTimes(MAX_REQUESTS);
    expect(data?.truncated).toEqual(["Anime list", "Favourites"]);
  });
});

describe("fetchAnilistMapping", () => {
  it("keeps the asked titles with their TMDB season and offset", async () => {
    stubFetch(() =>
      Response.json([
        { anilist_id: 1, themoviedb_id: { movie: [378064, 1] } },
        {
          anilist_id: 2,
          themoviedb_id: { tv: 1429 },
          season: { tvdb: 3, tmdb: 3 },
          episode_offset: { tmdb: 12 },
        },
        { anilist_id: 3, themoviedb_id: { tv: 37854 } },
        { anilist_id: 4, themoviedb_id: {} },
        { anilist_id: 5, themoviedb_id: { tv: 1 } },
        { mal_id: 9 },
      ]),
    );
    const mapping = await fetchAnilistMapping([1, 2, 3, 4]);
    expect([...mapping]).toEqual([
      [1, { kind: "movie", tmdbId: 378064 }],
      [2, { kind: "show", tmdbId: 1429, season: 3, offset: 12 }],
      [3, { kind: "show", tmdbId: 37854, season: null, offset: 0 }],
    ]);
  });
});
