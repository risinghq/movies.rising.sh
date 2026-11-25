import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { importErrorStatus, startImport } from "@/services/import";

// Body: the local days, YYYY-MM-DD, whose batched plays the user left undated.
export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<{ undatedDays?: unknown }>();
  const days = Array.isArray(body.undatedDays) ? body.undatedDays : [];
  if (!days.every((day): day is string => typeof day === "string")) {
    return c.json({ error: { kind: "invalid_payload" } }, 400);
  }

  const started = await startImport(user.id, c.req.param("id") ?? "", days);
  if (!started.ok) return c.json({ error: started.error }, importErrorStatus(started.error));
  return c.json({ ok: true });
});
