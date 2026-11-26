import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { discardImport, importErrorStatus } from "@/services/import";

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const discarded = await discardImport(user.id, c.req.param("id") ?? "");
  if (!discarded.ok) return c.json({ error: discarded.error }, importErrorStatus(discarded.error));
  return c.json({ ok: true });
});
