import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import * as v from "valibot";
import { connectedImportErrorStatus } from "@/services/import";
import { MAX_FILE_TITLES, scanFile, type FileImportError } from "@/services/import-file";

const Day = v.nullable(v.pipe(v.string(), v.isoDate()));
const Index = v.pipe(v.number(), v.integer(), v.minValue(0));
const Text = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500));

// The export as the browser read it (see domain/import/files.ts). The title
// cap leaves one over the service's limit so that limit answers with its
// own error.
const Body = v.object({
  source: v.picklist(["letterboxd", "imdb"]),
  scan: v.object({
    titles: v.pipe(
      v.array(
        v.object({
          title: Text,
          year: v.nullable(v.pipe(v.number(), v.integer())),
          imdbId: v.nullable(v.pipe(v.string(), v.regex(/^tt\d{1,10}$/))),
          mediaType: v.nullable(v.picklist(["movie", "show"])),
        }),
      ),
      v.maxLength(MAX_FILE_TITLES + 1),
    ),
    entries: v.pipe(
      v.array(
        v.variant("kind", [
          v.object({ kind: v.literal("play"), title: Index, watchedOn: Day }),
          v.object({
            kind: v.literal("rating"),
            title: Index,
            score100: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
            ratedOn: Day,
          }),
          v.object({ kind: v.literal("planned"), title: Index }),
          v.object({ kind: v.literal("favorite"), title: Index }),
        ]),
      ),
      v.maxLength(50_000),
    ),
    skipped: v.pipe(
      v.array(
        v.object({
          reason: v.picklist(["episode_rating", "episode_listed"]),
          title: Text,
        }),
      ),
      v.maxLength(50_000),
    ),
  }),
});

// Stages an import from a Letterboxd or IMDb export. Nothing is written to
// the library until the import is started.
export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = v.safeParse(Body, await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: { kind: "invalid_payload" } }, 400);
  const { source, scan } = body.output;
  if (scan.entries.some((entry) => entry.title >= scan.titles.length)) {
    return c.json({ error: { kind: "invalid_payload" } }, 400);
  }

  const staged = await scanFile(user.id, source, scan);
  if (!staged.ok) return c.json({ error: staged.error }, fileErrorStatus(staged.error));
  return c.json(staged.value);
});

function fileErrorStatus(error: FileImportError): 400 | 404 | 409 | 413 | 502 {
  return error.kind === "too_many_titles" ? 413 : connectedImportErrorStatus(error);
}
