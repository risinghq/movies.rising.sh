import * as v from "valibot";
import type { TraktExport } from "@/domain/import/trakt";
import { TRAKT_AUTH, traktAuthPost, traktClientId, traktGet } from "./client";

export type TraktPkce = { verifier: string; challenge: string };

// A fresh verifier for one sign-in: 64 characters from the unreserved set.
export async function createTraktPkce(): Promise<TraktPkce> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

export function traktAuthorizeUrl(input: {
  redirectUri: string;
  state: string;
  challenge: string;
}): string | null {
  const clientId = traktClientId();
  if (!clientId) return null;
  const url = new URL(`${TRAKT_AUTH}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

const Token = v.object({ access_token: v.string() });

// Null when Trakt refuses the code: the user denied access, the code expired
// or was used, or the verifier does not match.
export async function createTraktAccessToken(input: {
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<string | null> {
  const { status, body } = await traktAuthPost("/oauth/token", {
    code: input.code,
    code_verifier: input.verifier,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  });
  if (status !== 200) return null;
  const parsed = v.safeParse(Token, body);
  return parsed.success ? parsed.output.access_token : null;
}

export async function revokeTraktAccessToken(accessToken: string): Promise<void> {
  const { status } = await traktAuthPost("/oauth/revoke", { token: accessToken });
  if (status !== 200) throw new Error(`Trakt revoke → ${status}`);
}

// A scan reads at most this many pages of 250 rows. 50,000 rows is more than
// a stored import holds, so only a runaway list reaches it. A list cut short
// is reported.
export const MAX_PAGES = 200;
const PAGE_LIMIT = 250;

const LISTS = [
  { key: "history", path: "/sync/history", label: "History" },
  { key: "ratings", path: "/sync/ratings", label: "Ratings" },
  { key: "watchlist", path: "/sync/watchlist", label: "Watchlist" },
  { key: "favorites", path: "/sync/favorites", label: "Favorites" },
  { key: "dropped", path: "/users/hidden/dropped", label: "Dropped shows" },
] as const;

export async function fetchTraktExport(accessToken: string): Promise<TraktExport> {
  const data: TraktExport = {
    history: [],
    ratings: [],
    watchlist: [],
    favorites: [],
    dropped: [],
    truncated: [],
  };
  let budget = MAX_PAGES;

  for (const list of LISTS) {
    for (let page = 1; ; page += 1) {
      if (budget === 0) {
        data.truncated.push(list.label);
        break;
      }
      budget -= 1;
      const { rows, pageCount } = await traktGet(
        `${list.path}?page=${page}&limit=${PAGE_LIMIT}`,
        accessToken,
      );
      data[list.key].push(...rows);
      if (page >= pageCount || rows.length === 0) break;
    }
  }
  return data;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
