import { env } from "void/env";

const TMDB_BASE = "https://api.themoviedb.org/3";

export function tmdbToken(): string | null {
  const token = env.TMDB_READ_ACCESS_TOKEN;
  return typeof token === "string" && token.trim() !== "" ? token : null;
}

export async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = tmdbToken();
  if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN is not configured");

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "en-US");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  let response = await fetch(url, { headers });
  for (let retry = 0; response.status === 429 && retry < MAX_RATE_RETRIES; retry++) {
    await new Promise((resolve) => setTimeout(resolve, retryDelay(response)));
    response = await fetch(url, { headers });
  }
  if (!response.ok) throw new Error(`TMDB ${path} → ${response.status}`);
  return response.json() as Promise<T>;
}

// TMDB answers bursts above about 40 requests a second with 429 and a
// Retry-After in seconds. An import matching thousands of titles reaches it.
const MAX_RATE_RETRIES = 3;

function retryDelay(response: Response): number {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 10) * 1000 : 1000;
}

const TMDB_V4_BASE = "https://api.themoviedb.org/4";

// TMDB v4 answers a refused auth step with a JSON body and a 4xx status, so the
// body is returned with the status for the caller to read.
export async function tmdbV4Fetch(
  path: string,
  init: { method?: "GET" | "POST" | "DELETE"; token?: string; body?: unknown } = {},
): Promise<{ status: number; body: unknown }> {
  const token = init.token ?? tmdbToken();
  if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN is not configured");

  const response = await fetch(`${TMDB_V4_BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (response.status >= 500) throw new Error(`TMDB ${path} → ${response.status}`);
  return { status: response.status, body: await response.json().catch(() => null) };
}
