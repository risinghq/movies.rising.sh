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

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`TMDB ${path} → ${response.status}`);
  return response.json() as Promise<T>;
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
