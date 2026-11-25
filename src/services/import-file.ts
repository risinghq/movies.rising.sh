import { logger } from "void/log";
import { matchFileScan, type FileScan, type FileTitle } from "@/domain/import/files";
import type { ImportMediaRef } from "@/domain/import/items";
import { findTmdbByImdbId, searchTmdbTitle, tmdbToken } from "@/integrations/tmdb";
import { attempt, err, type Result } from "@/result";
import type { FileSource, ImportSummary } from "@/shared/import";
import { stageImport, type ConnectedImportError } from "./import";

// A title costs one TMDB request, or two when a name search misses on the
// year. Workers Paid allows 10,000 subrequests per request, so 3,000 titles
// leave room for the retries the rate limit forces.
export const MAX_FILE_TITLES = 3000;

// Parallel TMDB lookups. More reaches TMDB's rate limit sooner than it saves.
const CONCURRENCY = 8;

export type FileImportError = ConnectedImportError | { kind: "too_many_titles" };

// Matches each title of the export to TMDB, then stages it like any source.
export async function scanFile(
  userId: string,
  source: FileSource,
  scan: FileScan,
): Promise<Result<{ id: string; summary: ImportSummary }, FileImportError>> {
  if (scan.titles.length === 0) return err({ kind: "empty" });
  if (scan.titles.length > MAX_FILE_TITLES) return err({ kind: "too_many_titles" });
  if (!tmdbToken()) return err({ kind: "source_unavailable" });

  const matched = await attempt(mapPooled(scan.titles, CONCURRENCY, matchTitle), (cause) => cause);
  if (!matched.ok) {
    logger.warn("TMDB title match failed", { source, cause: matched.error });
    return err({ kind: "source_unavailable" });
  }
  return stageImport(userId, source, matchFileScan(scan, matched.value));
}

async function matchTitle(title: FileTitle): Promise<ImportMediaRef | null> {
  if (title.imdbId) return findTmdbByImdbId(title.imdbId, title.mediaType);
  return searchTmdbTitle(title.title, title.year, title.mediaType ?? "movie");
}

async function mapPooled<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
