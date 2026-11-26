import { logger } from "void/log";
import { readAnilist, showsNeedingSeasons, type SeasonSize } from "@/domain/import/anilist";
import { fetchAnilistExport, fetchAnilistMapping } from "@/integrations/anilist";
import { fetchShowSeasonSizes } from "@/integrations/tmdb";
import { attempt, err, type Result } from "@/result";
import type { ImportSummary } from "@/shared/import";
import { stageImport, type ConnectedImportError } from "./import";

// Reads a public AniList profile by name and stages it. AniList needs no
// approval for a public list, so the user only gives their username.
export async function scanAnilist(
  userId: string,
  userName: string,
): Promise<Result<{ id: string; summary: ImportSummary }, ConnectedImportError>> {
  const data = await attempt(fetchAnilistExport(userName), (cause) => cause);
  if (!data.ok) {
    logger.warn("AniList list read failed", { cause: data.error });
    return err({ kind: "source_unavailable" });
  }
  if (!data.value) return err({ kind: "unknown_user" });

  const ids = [...data.value.entries, ...data.value.favorites].map((e) => e.mediaId);
  const mapping = await attempt(fetchAnilistMapping(ids), (cause) => cause);
  if (!mapping.ok) {
    logger.warn("AniList mapping read failed", { cause: mapping.error });
    return err({ kind: "source_unavailable" });
  }

  const seasons = await seasonSizes(showsNeedingSeasons(data.value, mapping.value));
  return stageImport(userId, "anilist", readAnilist(data.value, mapping.value, seasons));
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
