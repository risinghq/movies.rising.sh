import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { connectedImportErrorStatus } from "@/services/import";
import { connectTrakt, traktRedirectUri } from "@/services/import-trakt";

export const POST = defineHandler(async (c) => {
  requireAuth(c);
  const connected = await connectTrakt(traktRedirectUri(c.req.url));
  if (!connected.ok)
    return c.json({ error: connected.error }, connectedImportErrorStatus(connected.error));
  return c.json(connected.value);
});
