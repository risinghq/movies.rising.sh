import { logger } from "void/log";
import {
  readAnilist,
  showsNeedingSeasons,
  type AnilistExport,
  type SeasonSize,
} from "@/domain/import/anilist";
import { fetchAnilistMapping } from "@/integrations/anilist";
import { fetchShowSeasonSizes } from "@/integrations/tmdb";
import { attempt, err, type Result } from "@/result";
import type { ImportSummary } from "@/shared/import";
import { stageImport, type ConnectedImportError } from "./import";

// Maps a public AniList list, which the browser read, onto TMDB and stages it.
export async function scanAnilist(
  userId: string,
  data: AnilistExport,
): Promise<Result<{ id: string; summary: ImportSummary }, ConnectedImportError>> {
  const ids = [...data.entries, ...data.favorites].map((e) => e.mediaId);
  const mapping = await attempt(fetchAnilistMapping(ids), (cause) => cause);
  if (!mapping.ok) {
    logger.warn("AniList mapping read failed", { cause: mapping.error });
    return err({ kind: "source_unavailable" });
  }

  const seasons = await seasonSizes(showsNeedingSeasons(data, mapping.value));
  return stageImport(userId, "anilist", readAnilist(data, mapping.value, seasons));
}

// A show TMDB cannot answer for stays out of the map; the reader reports its
// titles as unmatched.
async function seasonSizes(tmdbIds: number[]): Promise<Map<number, SeasonSize[]>> {
  const sizes = new Map<number, SeasonSize[]>();
  const results = await Promise.allSettled(tmdbIds.map((id) => fetchShowSeasonSizes(id)));
  results.forEach((result, i) => {
    if (result.status === "fulfilled") sizes.set(tmdbIds[i]!, result.value);
    else logger.warn("TMDB season sizes failed", { tmdbId: tmdbIds[i], cause: result.reason });
  });
  return sizes;
}
