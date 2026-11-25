import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { tmdbFetch } from "./client";

vi.mock("void/env", () => ({ env: { TMDB_READ_ACCESS_TOKEN: "token" } }));

const fetchMock = vi.fn<typeof fetch>();

function memoryCache() {
  const store = new Map<string, Response>();
  return {
    store,
    match: vi.fn<(key: URL) => Promise<Response | undefined>>(async (key) =>
      store.get(String(key))?.clone(),
    ),
    put: vi.fn<(key: URL, response: Response) => Promise<void>>(async (key, response) => {
      store.set(String(key), response);
    }),
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tmdbFetch", () => {
  it("serves a repeated GET from the edge cache", async () => {
    const cache = memoryCache();
    vi.stubGlobal("caches", { default: cache });
    fetchMock.mockResolvedValue(Response.json({ id: 1 }));

    expect(await tmdbFetch("/person/1")).toEqual({ id: 1 });
    expect(await tmdbFetch("/person/1")).toEqual({ id: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [stored] = [...cache.store.values()];
    expect(stored?.headers.get("cache-control")).toBe("public, max-age=21600");
  });

  it("does not cache a failed response", async () => {
    const cache = memoryCache();
    vi.stubGlobal("caches", { default: cache });
    fetchMock.mockResolvedValue(new Response("nope", { status: 404 }));

    await expect(tmdbFetch("/person/2")).rejects.toThrow("TMDB /person/2 → 404");
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("fetches every time without an edge cache", async () => {
    fetchMock.mockImplementation(async () => Response.json({ id: 3 }));

    await tmdbFetch("/person/3");
    await tmdbFetch("/person/3");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
