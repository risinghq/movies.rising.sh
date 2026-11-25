import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { connectTmdb, tmdbImportErrorStatus } from "@/services/import-tmdb";

// The client keeps the request token across TMDB's approval page and posts it
// to the scan route. Without the server's read token it grants nothing.
export const POST = defineHandler(async (c) => {
  requireAuth(c);
  const returnTo = `${new URL(c.req.url).origin}/import/tmdb`;
  const connected = await connectTmdb(returnTo);
  if (!connected.ok)
    return c.json({ error: connected.error }, tmdbImportErrorStatus(connected.error));
  return c.json(connected.value);
});
