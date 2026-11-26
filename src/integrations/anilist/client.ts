import * as v from "valibot";
import { ANILIST_STATUSES, type AnilistEntry, type AnilistExport } from "@/domain/import/anilist";
import { fetchWithRetry } from "../http";

const ANILIST_API = "https://graphql.anilist.co";

// One request reads a chunk of the list and a page of favourites; the
// directives drop whichever part is already read.
const QUERY = `query ($name: String, $chunk: Int, $favPage: Int, $list: Boolean!, $favs: Boolean!) {
  MediaListCollection(userName: $name, type: ANIME, chunk: $chunk, perChunk: 500) @include(if: $list) {
    hasNextChunk
    lists { isCustomList entries {
      status progress score(format: POINT_100) updatedAt
      completedAt { year month day }
      media { id episodes title { english romaji } }
    } }
  }
  User(name: $name) @include(if: $favs) {
    favourites { anime(page: $favPage, perPage: 25) {
      pageInfo { hasNextPage }
      nodes { id title { english romaji } }
    } }
  }
}`;

// AniList allows 30 requests a minute while it runs degraded (90 otherwise).
// 12 requests read 6,000 list entries and 300 favourites.
export const MAX_REQUESTS = 12;

const Title = v.object({ english: v.nullable(v.string()), romaji: v.nullable(v.string()) });
const Media = v.object({ id: v.number(), episodes: v.nullish(v.number(), null), title: Title });
const FuzzyDate = v.object({
  year: v.nullable(v.number()),
  month: v.nullable(v.number()),
  day: v.nullable(v.number()),
});
const Entry = v.object({
  status: v.picklist(ANILIST_STATUSES),
  progress: v.nullish(v.number(), 0),
  score: v.nullish(v.number(), 0),
  updatedAt: v.nullish(v.number(), 0),
  completedAt: v.nullish(FuzzyDate, null),
  media: Media,
});
const Reply = v.object({
  data: v.nullable(
    v.object({
      MediaListCollection: v.nullish(
        v.object({
          hasNextChunk: v.nullish(v.boolean(), false),
          lists: v.array(v.object({ isCustomList: v.boolean(), entries: v.array(Entry) })),
        }),
      ),
      User: v.nullish(
        v.object({
          favourites: v.object({
            anime: v.object({
              pageInfo: v.object({ hasNextPage: v.boolean() }),
              nodes: v.array(v.object({ id: v.number(), title: Title })),
            }),
          }),
        }),
      ),
    }),
  ),
});

/** Reads a public anime list, or null when no public profile has this name. */
export async function fetchAnilistExport(userName: string): Promise<AnilistExport | null> {
  const data: AnilistExport = { entries: [], favorites: [], truncated: [] };
  const cursor: Cursor = { chunk: 1, favPage: 1, list: true, favs: true };
  for (let request = 0; request < MAX_REQUESTS && (cursor.list || cursor.favs); request++) {
    const body = await post({ name: userName, ...cursor });
    if (body === null) return null;
    takeList(body, cursor, data);
    takeFavourites(body, cursor, data);
  }
  if (cursor.list) data.truncated.push("Anime list");
  if (cursor.favs) data.truncated.push("Favourites");
  return data;
}

// The next chunk and favourites page to read; a false flag means that part is read.
type Cursor = { chunk: number; favPage: number; list: boolean; favs: boolean };
type Variables = Cursor & { name: string };
type Body = NonNullable<v.InferOutput<typeof Reply>["data"]>;

function takeList(body: Body, cursor: Cursor, data: AnilistExport): void {
  const collection = body.MediaListCollection;
  if (!cursor.list || !collection) return;
  for (const list of collection.lists) {
    // A custom list repeats entries its status list already holds.
    if (!list.isCustomList) data.entries.push(...list.entries.map(toEntry));
  }
  cursor.list = collection.hasNextChunk;
  cursor.chunk += 1;
}

function takeFavourites(body: Body, cursor: Cursor, data: AnilistExport): void {
  const anime = body.User?.favourites.anime;
  if (!cursor.favs || !anime) return;
  data.favorites.push(...anime.nodes.map((n) => ({ mediaId: n.id, title: title(n.title) })));
  cursor.favs = anime.pageInfo.hasNextPage;
  cursor.favPage += 1;
}

// AniList answers a missing or private user with 404 and null data.
async function post(variables: Variables): Promise<Body | null> {
  const response = await fetchWithRetry(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables }),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`AniList → ${response.status}`);
  const body = v.parse(Reply, await response.json());
  if (!body.data) throw new Error("AniList answered without data");
  const missing =
    (variables.list && !body.data.MediaListCollection) || (variables.favs && !body.data.User);
  return missing ? null : body.data;
}

function toEntry(entry: v.InferOutput<typeof Entry>): AnilistEntry {
  return {
    mediaId: entry.media.id,
    title: title(entry.media.title),
    status: entry.status,
    progress: entry.progress,
    episodes: entry.media.episodes,
    score100: entry.score,
    updatedAt: entry.updatedAt,
    completedOn: day(entry.completedAt),
  };
}

function title(t: v.InferOutput<typeof Title>): string {
  return t.english ?? t.romaji ?? "Unknown";
}

function day(date: v.InferOutput<typeof FuzzyDate> | null): string | null {
  if (!date?.year || !date.month || !date.day) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}
