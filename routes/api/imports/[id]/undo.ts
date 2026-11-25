import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { importErrorStatus, undoImport } from "@/services/import";

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const undone = await undoImport(user.id, c.req.param("id") ?? "");
  if (!undone.ok) return c.json({ error: undone.error }, importErrorStatus(undone.error));
  return c.json({ ok: true });
});
