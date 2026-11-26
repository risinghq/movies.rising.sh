import { env } from "void/env";
import { fetchWithRetry } from "../http";

const TRAKT_API = "https://api.trakt.tv";
// Trakt serves every OAuth step (authorize, token, revoke) from this host.
export const TRAKT_AUTH = "https://auth.trakt.tv";
const USER_AGENT = "movies.rising.sh/1.0";

// The client ID of the Trakt app. It is public: it appears in every authorize
// URL. A PKCE app has no client secret.
export function traktClientId(): string | null {
  const id = env.TRAKT_CLIENT_ID;
  return typeof id === "string" && id.trim() !== "" ? id.trim() : null;
}

function requireClientId(): string {
  const id = traktClientId();
  if (!id) throw new Error("TRAKT_CLIENT_ID is not configured");
  return id;
}

export type TraktPage = { rows: unknown[]; pageCount: number };

// Trakt allows a user 500 GETs per 5 minutes; a scan stays far below that.
export async function traktGet(path: string, accessToken: string): Promise<TraktPage> {
  const response = await fetchWithRetry(`${TRAKT_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "trakt-api-key": requireClientId(),
      "trakt-api-version": "2",
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) throw new Error(`Trakt ${path} → ${response.status}`);
  const body: unknown = await response.json();
  return {
    rows: Array.isArray(body) ? body : [],
    pageCount: Number(response.headers.get("X-Pagination-Page-Count") ?? 1) || 0,
  };
}

// Trakt answers a refused OAuth step with a 4xx and a JSON error body, so the
// status is returned with the body for the caller to read.
export async function traktAuthPost(
  path: string,
  body: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${TRAKT_AUTH}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ ...body, client_id: requireClientId() }),
  });
  if (response.status >= 500) throw new Error(`Trakt ${path} → ${response.status}`);
  return { status: response.status, body: await response.json().catch(() => null) };
}
