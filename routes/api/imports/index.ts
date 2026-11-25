import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { listUserImports } from "@/domain/import/store";
import { readTrakt, type TraktExport } from "@/domain/import/trakt";
import { importErrorStatus, stageImport } from "@/services/import";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  return c.json({ imports: await listUserImports(user.id) });
});

// Stages an import from a Trakt export the client already holds. Nothing is
// written to the library until the import is started.
export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<{ source?: unknown; data?: unknown }>();
  if (body.source !== "trakt") return c.json({ error: { kind: "unknown_source" } }, 400);

  const data = readTraktExport(body.data);
  if (!data) return c.json({ error: { kind: "invalid_payload" } }, 400);

  const staged = await stageImport(user.id, "trakt", readTrakt(data));
  if (!staged.ok) return c.json({ error: staged.error }, importErrorStatus(staged.error));
  return c.json(staged.value);
});

function readTraktExport(value: unknown): TraktExport | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const list = (key: string) => (Array.isArray(data[key]) ? (data[key] as unknown[]) : []);
  return {
    history: list("history"),
    ratings: list("ratings"),
    watchlist: list("watchlist"),
    favorites: list("favorites"),
    dropped: list("dropped"),
  };
}
