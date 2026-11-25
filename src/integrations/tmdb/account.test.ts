import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { readTmdb } from "@/domain/import/tmdb";
import { MAX_PAGES, fetchTmdbAccountLists } from "./account";

const { tmdbV4Fetch } = vi.hoisted(() => ({
  tmdbV4Fetch:
    vi.fn<(path: string, init?: unknown) => Promise<{ status: number; body: unknown }>>(),
}));

vi.mock("./client", () => ({ tmdbV4Fetch }));

const access = { accessToken: "user-token", accountId: "acct" };

const ratedMovie = (id: number, value: number) => ({
  id,
  title: `Movie ${id}`,
  account_rating: { value, created_at: "2020-01-21T00:00:00Z" },
});

function answer(pages: Record<string, { results: unknown[]; total_pages: number }>) {
  tmdbV4Fetch.mockImplementation(async (path) => {
    const key = path.replace("/account/acct/", "");
    return { status: 200, body: pages[key] ?? { results: [], total_pages: 0 } };
  });
}

beforeEach(() => {
  tmdbV4Fetch.mockReset();
});

describe("fetchTmdbAccountLists", () => {
  it("reads every page of each list with the user's token", async () => {
    answer({
      "movie/rated?page=1": { results: [ratedMovie(11, 6)], total_pages: 2 },
      "movie/rated?page=2": { results: [ratedMovie(12, 7.5)], total_pages: 2 },
      "tv/rated?page=1": {
        results: [
          { id: 66732, name: "Stranger Things", account_rating: { value: 8, created_at: null } },
        ],
        total_pages: 1,
      },
      "movie/watchlist?page=1": {
        results: [{ id: 570503, title: "Tune in for Love" }],
        total_pages: 1,
      },
      "tv/favorites?page=1": {
        results: [{ id: 1399, name: "Game of Thrones" }, { title: "no id" }],
        total_pages: 1,
      },
    });

    const lists = await fetchTmdbAccountLists(access);

    expect(tmdbV4Fetch).toHaveBeenCalledTimes(7);
    expect(tmdbV4Fetch.mock.calls[0]?.[1]).toEqual({ token: "user-token" });
    expect(lists.rated.map((t) => [t.media.mediaType, t.media.tmdbId, t.rating?.value])).toEqual([
      ["movie", 11, 6],
      ["movie", 12, 7.5],
      ["show", 66732, 8],
    ]);
    expect(lists.rated[0]?.rating?.ratedAt).toBe(Date.parse("2020-01-21T00:00:00Z"));
    expect(lists.rated[2]?.rating?.ratedAt).toBe(0);
    expect(lists.watchlist.map((t) => t.media.title)).toEqual(["Tune in for Love"]);
    expect(lists.favorites.map((t) => t.media.tmdbId)).toEqual([1399]);
    expect(lists.truncated).toEqual([]);
  });

  it("stops at the page budget and names the lists it cut short", async () => {
    tmdbV4Fetch.mockResolvedValue({
      status: 200,
      body: { results: [ratedMovie(1, 5)], total_pages: MAX_PAGES + 1 },
    });

    const lists = await fetchTmdbAccountLists(access);

    expect(tmdbV4Fetch).toHaveBeenCalledTimes(MAX_PAGES);
    expect(lists.truncated).toEqual([
      "Rated movies",
      "Rated shows",
      "Movie watchlist",
      "Show watchlist",
      "Favorite movies",
      "Favorite shows",
    ]);
  });

  it("throws when TMDB refuses a list", async () => {
    tmdbV4Fetch.mockResolvedValue({ status: 401, body: { success: false } });
    await expect(fetchTmdbAccountLists(access)).rejects.toThrow("movie/rated");
  });
});

describe("readTmdb", () => {
  it("turns ratings, the watchlist and favorites into import items", () => {
    const movie = { mediaType: "movie" as const, tmdbId: 11, title: "Star Wars" };
    const show = { mediaType: "show" as const, tmdbId: 1399, title: "Game of Thrones" };
    const scan = readTmdb({
      rated: [
        { media: movie, rating: { value: 6.5, ratedAt: 5 } },
        { media: show, rating: null },
      ],
      watchlist: [{ media: show, rating: null }],
      favorites: [{ media: movie, rating: null }],
      truncated: ["Rated shows"],
    });

    expect(scan.items).toEqual([
      { kind: "rating", media: movie, score100: 65, ratedAt: 5 },
      { kind: "planned", media: show },
      { kind: "favorite", media: movie, note: null },
    ]);
    expect(scan.skipped).toEqual([{ reason: "list_truncated", title: "Rated shows" }]);
  });
});
