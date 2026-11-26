import * as v from "valibot";
import type { AnilistMapping, AnilistTarget } from "@/domain/import/anilist";

// Fribb/anime-lists joins AniList ids to TMDB ids, seasons and episode
// offsets. It is rebuilt weekly; the mini file (about 6 MB, 40,000 titles)
// holds only the ids.
const MAPPING_URL = "https://cdn.jsdelivr.net/gh/Fribb/anime-lists@master/anime-list-mini.json";
const EDGE_TTL_SECONDS = 24 * 60 * 60;

const Row = v.object({
  anilist_id: v.optional(v.number()),
  themoviedb_id: v.optional(
    v.object({ tv: v.optional(v.number()), movie: v.optional(v.array(v.number())) }),
  ),
  season: v.optional(v.object({ tmdb: v.optional(v.number()) })),
  episode_offset: v.optional(v.object({ tmdb: v.optional(v.number()) })),
});

/** The TMDB targets of the given AniList titles; unmapped titles are absent. */
export async function fetchAnilistMapping(ids: Iterable<number>): Promise<AnilistMapping> {
  const wanted = new Set(ids);
  const rows: unknown = JSON.parse(await mappingText());
  const mapping = new Map<number, AnilistTarget>();
  if (!Array.isArray(rows)) throw new Error("AniList mapping is not a list");
  for (const raw of rows) {
    const id = (raw as { anilist_id?: unknown } | null)?.anilist_id;
    if (typeof id !== "number" || !wanted.has(id)) continue;
    const parsed = v.safeParse(Row, raw);
    const target = parsed.success ? toTarget(parsed.output) : null;
    if (target) mapping.set(id, target);
  }
  return mapping;
}

function toTarget(row: v.InferOutput<typeof Row>): AnilistTarget | null {
  const tmdb = row.themoviedb_id;
  if (tmdb?.tv !== undefined) {
    return {
      kind: "show",
      tmdbId: tmdb.tv,
      season: row.season?.tmdb ?? null,
      offset: row.episode_offset?.tmdb ?? 0,
    };
  }
  // A few titles list several TMDB movies (a film cut in parts); the first is the title.
  const movie = tmdb?.movie?.[0];
  return movie === undefined ? null : { kind: "movie", tmdbId: movie };
}

// The file is kept in the Workers edge cache for a day, so scans in a row
// fetch it once. Outside Workers there is no `caches.default`.
async function mappingText(): Promise<string> {
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const hit = await cache?.match(MAPPING_URL);
  if (hit) return hit.text();
  const response = await fetch(MAPPING_URL);
  if (!response.ok) throw new Error(`AniList mapping → ${response.status}`);
  const text = await response.text();
  await cache
    ?.put(
      MAPPING_URL,
      new Response(text, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${EDGE_TTL_SECONDS}`,
        },
      }),
    )
    .catch(() => undefined);
  return text;
}
