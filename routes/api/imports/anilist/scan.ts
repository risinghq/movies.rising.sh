import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { connectedImportErrorStatus } from "@/services/import";
import { scanAnilist } from "@/services/import-anilist";

// AniList names are letters, digits, "_" and "-", at most 20 characters.
const USERNAME = /^[\w-]{1,20}$/;

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const { username } = await c.req.json<{ username?: unknown }>();
  const name = typeof username === "string" ? username.trim().replace(/^@/, "") : "";
  if (!USERNAME.test(name)) return c.json({ error: { kind: "unknown_user" } }, 404);
  const staged = await scanAnilist(user.id, name);
  if (!staged.ok) return c.json({ error: staged.error }, connectedImportErrorStatus(staged.error));
  return c.json(staged.value);
});
