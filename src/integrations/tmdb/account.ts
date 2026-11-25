import * as v from "valibot";
import type { TmdbAccountLists, TmdbAccountTitle } from "@/domain/import/tmdb";
import { tmdbV4Fetch } from "./client";
import { Id, NullNum, NullStr, looseArray, parse } from "./parse";

export const TMDB_APPROVE_URL = "https://www.themoviedb.org/auth/access";

// A scan reads at most this many list pages (20 titles each), well under the
// paid Workers plan's 10,000 subrequests per request. 10,000 titles is about
// what the stored import holds. A list cut short is reported.
export const MAX_PAGES = 500;

export type TmdbAccess = { accessToken: string; accountId: string };

const RequestToken = v.object({ request_token: v.string() });
const AccessToken = v.object({ access_token: v.string(), account_id: v.string() });

// Starts TMDB's user approval. The user approves the token on TMDB, which then
// sends them to `redirectTo`.
export async function createTmdbRequestToken(redirectTo: string): Promise<string> {
  const { status, body } = await tmdbV4Fetch("/auth/request_token", {
    method: "POST",
    body: { redirect_to: redirectTo },
  });
  if (status !== 200) throw new Error(`TMDB request token → ${status}`);
  return parse(RequestToken, body).request_token;
}

// Null when the user has not approved the token: they denied it, or it expired.
export async function createTmdbAccessToken(requestToken: string): Promise<TmdbAccess | null> {
  const { status, body } = await tmdbV4Fetch("/auth/access_token", {
    method: "POST",
    body: { request_token: requestToken },
  });
  if (status !== 200) return null;
  const parsed = parse(AccessToken, body);
  return { accessToken: parsed.access_token, accountId: parsed.account_id };
}

export async function revokeTmdbAccessToken(accessToken: string): Promise<void> {
  await tmdbV4Fetch("/auth/access_token", {
    method: "DELETE",
    body: { access_token: accessToken },
  });
}

const AccountTitle = v.object({
  id: Id,
  title: NullStr,
  name: NullStr,
  account_rating: v.optional(
    v.fallback(v.nullable(v.object({ value: v.number(), created_at: NullStr })), null),
    null,
  ),
});
const AccountPage = v.object({
  results: looseArray(AccountTitle),
  total_pages: NullNum,
});

const LISTS = [
  { key: "rated", path: "movie/rated", mediaType: "movie", label: "Rated movies" },
  { key: "rated", path: "tv/rated", mediaType: "show", label: "Rated shows" },
  { key: "watchlist", path: "movie/watchlist", mediaType: "movie", label: "Movie watchlist" },
  { key: "watchlist", path: "tv/watchlist", mediaType: "show", label: "Show watchlist" },
  { key: "favorites", path: "movie/favorites", mediaType: "movie", label: "Favorite movies" },
  { key: "favorites", path: "tv/favorites", mediaType: "show", label: "Favorite shows" },
] as const;

export async function fetchTmdbAccountLists(access: TmdbAccess): Promise<TmdbAccountLists> {
  const lists: TmdbAccountLists = { rated: [], watchlist: [], favorites: [], truncated: [] };
  let budget = MAX_PAGES;

  for (const list of LISTS) {
    const read = await fetchList(access, list, budget);
    budget -= read.pages;
    lists[list.key].push(...read.titles);
    if (read.truncated) lists.truncated.push(list.label);
  }
  return lists;
}

/** Reads one list page by page, stopping when `budget` pages are spent. */
async function fetchList(
  access: TmdbAccess,
  list: (typeof LISTS)[number],
  budget: number,
): Promise<{ titles: TmdbAccountTitle[]; pages: number; truncated: boolean }> {
  const titles: TmdbAccountTitle[] = [];
  for (let page = 1; page <= budget; page += 1) {
    const { status, body } = await tmdbV4Fetch(
      `/account/${access.accountId}/${list.path}?page=${page}`,
      { token: access.accessToken },
    );
    if (status !== 200) throw new Error(`TMDB ${list.path} → ${status}`);
    const parsed = parse(AccountPage, body);
    for (const row of parsed.results) {
      const title = mapTitle(row, list.mediaType);
      if (title) titles.push(title);
    }
    if (page >= (parsed.total_pages ?? 0)) return { titles, pages: page, truncated: false };
  }
  return { titles, pages: budget, truncated: true };
}

function mapTitle(
  row: v.InferOutput<typeof AccountTitle>,
  mediaType: "movie" | "show",
): TmdbAccountTitle | null {
  const title = row.title ?? row.name;
  if (!title) return null;
  const rating = row.account_rating;
  const ratedAt = rating?.created_at ? Date.parse(rating.created_at) : NaN;
  return {
    media: { mediaType, tmdbId: row.id, title },
    rating: rating
      ? { value: rating.value, ratedAt: Number.isFinite(ratedAt) ? ratedAt : 0 }
      : null,
  };
}
