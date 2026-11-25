import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { connectedImportErrorStatus } from "@/services/import";
import { scanTrakt, traktRedirectUri } from "@/services/import-trakt";

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const { code, verifier } = await c.req.json<{ code?: unknown; verifier?: unknown }>();
  if (typeof code !== "string" || code === "" || typeof verifier !== "string" || verifier === "") {
    return c.json({ error: { kind: "invalid_payload" } }, 400);
  }
  const redirectUri = traktRedirectUri(c.req.url);
  const staged = await scanTrakt(user.id, { code, verifier, redirectUri });
  if (!staged.ok) return c.json({ error: staged.error }, connectedImportErrorStatus(staged.error));
  return c.json(staged.value);
});
