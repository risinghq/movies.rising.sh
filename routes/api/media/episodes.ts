import { defineHandler } from "void";
import { listSeasonEpisodes } from "@/domain/catalog/episodes";

// Public catalog data: the episodes of one season, for a season opened on the
// media page.
export const GET = defineHandler(async (c) => {
  const mediaId = c.req.query("mediaId");
  const season = Number(c.req.query("season"));
  if (!mediaId || !Number.isInteger(season) || season < 0) {
    return c.json({ error: "mediaId and a season number are required" }, 400);
  }

  c.header("Cache-Control", "public, max-age=300");
  return c.json(await listSeasonEpisodes(mediaId, season));
});
