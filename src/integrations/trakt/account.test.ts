import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { MAX_PAGES, createTraktAccessToken, fetchTraktExport } from "./account";

const { traktGet, traktAuthPost } = vi.hoisted(() => ({
  traktGet:
    vi.fn<(path: string, token: string) => Promise<{ rows: unknown[]; pageCount: number }>>(),
  traktAuthPost:
    vi.fn<
      (path: string, body: Record<string, string>) => Promise<{ status: number; body: unknown }>
    >(),
}));

vi.mock("./client", () => ({
  TRAKT_AUTH: "https://auth.trakt.tv",
  traktClientId: () => "client",
  traktGet,
  traktAuthPost,
}));

beforeEach(() => {
  traktGet.mockReset();
  traktAuthPost.mockReset();
});

describe("fetchTraktExport", () => {
  it("reads every page of each list with the user's token", async () => {
    traktGet.mockImplementation(async (path) => {
      if (path.startsWith("/sync/history?page=1&")) return { rows: ["h1"], pageCount: 2 };
      if (path.startsWith("/sync/history?page=2&")) return { rows: ["h2"], pageCount: 2 };
      if (path.startsWith("/sync/favorites?page=1&")) return { rows: ["f1"], pageCount: 1 };
      return { rows: [], pageCount: 0 };
    });

    const data = await fetchTraktExport("user-token");

    expect(traktGet).toHaveBeenCalledTimes(6);
    expect(traktGet.mock.calls[0]).toEqual(["/sync/history?page=1&limit=250", "user-token"]);
    expect(data).toEqual({
      history: ["h1", "h2"],
      ratings: [],
      watchlist: [],
      favorites: ["f1"],
      dropped: [],
      truncated: [],
    });
  });

  it("stops at the page budget and names every list it cut short", async () => {
    traktGet.mockResolvedValue({ rows: ["row"], pageCount: MAX_PAGES + 1 });

    const data = await fetchTraktExport("user-token");

    expect(traktGet).toHaveBeenCalledTimes(MAX_PAGES);
    expect(data.history).toHaveLength(MAX_PAGES);
    expect(data.truncated).toEqual([
      "History",
      "Ratings",
      "Watchlist",
      "Favorites",
      "Dropped shows",
    ]);
  });
});

describe("createTraktAccessToken", () => {
  const input = { code: "c", verifier: "v", redirectUri: "https://x/import/trakt/callback" };

  it("sends the code with its verifier", async () => {
    traktAuthPost.mockResolvedValue({ status: 200, body: { access_token: "t" } });
    expect(await createTraktAccessToken(input)).toBe("t");
    expect(traktAuthPost).toHaveBeenCalledWith("/oauth/token", {
      code: "c",
      code_verifier: "v",
      redirect_uri: "https://x/import/trakt/callback",
      grant_type: "authorization_code",
    });
  });

  it("returns null when Trakt refuses the code", async () => {
    traktAuthPost.mockResolvedValue({ status: 401, body: { error: "invalid_grant" } });
    expect(await createTraktAccessToken(input)).toBeNull();
  });
});
