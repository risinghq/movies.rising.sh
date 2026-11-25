import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { connectedImportErrorStatus } from "@/services/import";
import { scanTmdb } from "@/services/import-tmdb";

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<{ requestToken?: unknown }>();
  if (typeof body.requestToken !== "string" || body.requestToken === "") {
    return c.json({ error: { kind: "invalid_payload" } }, 400);
  }
  const staged = await scanTmdb(user.id, body.requestToken);
  if (!staged.ok) return c.json({ error: staged.error }, connectedImportErrorStatus(staged.error));
  return c.json(staged.value);
});
