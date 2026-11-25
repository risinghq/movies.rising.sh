import { toMediaId } from "@/domain/catalog/media";
import type { ImportSummary } from "@/shared/import";
import { findBatchDays } from "./batches";
import type { ImportScan } from "./items";

export function summarizeScan(scan: ImportScan, timeZone: string | null): ImportSummary {
  const titles = new Set<string>();
  const summary: ImportSummary = {
    titles: 0,
    plays: 0,
    ratings: 0,
    planned: 0,
    favorites: 0,
    dropped: 0,
    skipped: {},
    batchDays: findBatchDays(scan.items, timeZone),
  };
  for (const item of scan.items) {
    titles.add(toMediaId(item.media.mediaType, item.media.tmdbId));
    if (item.kind === "play") summary.plays += 1;
    if (item.kind === "rating") summary.ratings += 1;
    if (item.kind === "planned") summary.planned += 1;
    if (item.kind === "favorite") summary.favorites += 1;
    if (item.kind === "dropped") summary.dropped += 1;
  }
  for (const skipped of scan.skipped) {
    summary.skipped[skipped.reason] = (summary.skipped[skipped.reason] ?? 0) + 1;
  }
  summary.titles = titles.size;
  return summary;
}
