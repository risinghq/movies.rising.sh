import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import * as v from "valibot";
import { ANILIST_STATUSES } from "@/domain/import/anilist";
import { MAX_REQUESTS } from "@/integrations/anilist/client";
import { connectedImportErrorStatus } from "@/services/import";
import { scanAnilist } from "@/services/import-anilist";

const Id = v.pipe(v.number(), v.integer(), v.minValue(1));
const Count = v.pipe(v.number(), v.integer(), v.minValue(0));
const Text = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500));

// The list as the browser read it from AniList (see integrations/anilist/client.ts).
// The caps are what MAX_REQUESTS reads: 500 entries a chunk, 25 favourites a page.
const Body = v.object({
  entries: v.pipe(
    v.array(
      v.object({
        mediaId: Id,
        title: Text,
        status: v.picklist(ANILIST_STATUSES),
        progress: Count,
        episodes: v.nullable(Count),
        score100: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
        updatedAt: Count,
        completedOn: v.nullable(v.pipe(v.string(), v.isoDate())),
      }),
    ),
    v.maxLength(MAX_REQUESTS * 500),
  ),
  favorites: v.pipe(
    v.array(v.object({ mediaId: Id, title: Text })),
    v.maxLength(MAX_REQUESTS * 25),
  ),
  truncated: v.array(v.picklist(["Anime list", "Favourites"])),
});

// Stages an import from a public AniList list. AniList refuses requests from
// Workers, so the browser reads the list and the server maps it onto TMDB.
export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = v.safeParse(Body, await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: { kind: "invalid_payload" } }, 400);
  const staged = await scanAnilist(user.id, body.output);
  if (!staged.ok) return c.json({ error: staged.error }, connectedImportErrorStatus(staged.error));
  return c.json(staged.value);
});
