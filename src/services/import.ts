import { queues } from "void/queues";
import { logger } from "void/log";
import { findMediaByTmdbIds, mediaStubsWrite, toMediaId } from "@/domain/catalog/media";
import { undateBatchDays } from "@/domain/import/batches";
import type { ImportItem, ImportScan } from "@/domain/import/items";
import { planImport } from "@/domain/import/plan";
import {
  createImport,
  deleteScannedImport,
  findImport,
  findUserImport,
  importPlanWrites,
  loadExistingLibrary,
  moveImport,
  saveImportReport,
  undoImportWrites,
} from "@/domain/import/store";
import { summarizeScan } from "@/domain/import/summary";
import { getUserTimeZone } from "@/domain/user";
import { runBatch } from "@/db/kernel";
import { err, ok, type Result } from "@/result";
import { chunk } from "@/shared/chunk";
import type { ImportReport, ImportSource, ImportSummary } from "@/shared/import";
import { enqueueMediaDetails } from "./media-hydration";

export type ImportMessage = { importId: string };

export type ImportError =
  | { kind: "not_found" }
  | { kind: "wrong_state" }
  | { kind: "empty" }
  | { kind: "too_large" };

// A source read through the user's approval (TMDB, Trakt) can also be down or
// refuse the approval.
export type ConnectedImportError =
  | ImportError
  | { kind: "source_unavailable" }
  | { kind: "not_approved" };

export function connectedImportErrorStatus(
  error: ConnectedImportError,
): 400 | 404 | 409 | 413 | 502 {
  if (error.kind === "source_unavailable") return 502;
  if (error.kind === "not_approved") return 400;
  return importErrorStatus(error);
}

export function importErrorStatus(error: ImportError): 400 | 404 | 409 | 413 {
  switch (error.kind) {
    case "not_found":
      return 404;
    case "wrong_state":
      return 409;
    case "empty":
      return 400;
    case "too_large":
      return 413;
  }
}

// D1 caps a stored value at 2 MB. A history this large is about 15,000 plays.
const MAX_ITEMS_BYTES = 1_900_000;

// Statements per D1 batch. A batch is one transaction, and a smaller one keeps
// each round trip short. A retried import skips rows already written.
const WRITE_BATCH = 50;

export async function stageImport(
  userId: string,
  source: ImportSource,
  scan: ImportScan,
): Promise<Result<{ id: string; summary: ImportSummary }, ImportError>> {
  if (scan.items.length === 0) return err({ kind: "empty" });
  const items = JSON.stringify(scan.items);
  if (new TextEncoder().encode(items).length > MAX_ITEMS_BYTES) return err({ kind: "too_large" });

  const summary = summarizeScan(scan, await getUserTimeZone(userId));
  const id = crypto.randomUUID();
  await createImport({ id, userId, source, items, summary: JSON.stringify(summary) });
  return ok({ id, summary });
}

// Applies the user's Review choice, then hands the write to the queue.
export async function startImport(
  userId: string,
  importId: string,
  undatedDays: readonly string[],
): Promise<Result<void, ImportError>> {
  const row = await findUserImport(userId, importId);
  if (!row) return err({ kind: "not_found" });
  if (row.state !== "scanned" || !row.items) return err({ kind: "wrong_state" });

  const timeZone = await getUserTimeZone(userId);
  const items = undateBatchDays(readItems(row.items), new Set(undatedDays), timeZone);
  const moved = await moveImport(importId, "scanned", "importing", {
    items: JSON.stringify(items),
  });
  if (!moved) return err({ kind: "wrong_state" });

  try {
    await queues.imports.send({ importId } satisfies ImportMessage);
  } catch (cause) {
    logger.error("failed to enqueue import", { importId, cause });
    await moveImport(importId, "importing", "failed", { error: "enqueue_failed" });
    throw cause;
  }
  return ok(undefined);
}

// The queue consumer's work. Safe to retry: a second run finds the rows the
// first one wrote and adds only what is missing.
export async function runImport(importId: string): Promise<void> {
  const row = await findImport(importId);
  if (!row || row.state !== "importing" || !row.items) return;

  const timeZone = await getUserTimeZone(row.userId);
  const items = readItems(row.items);

  const stubbed = await stubMissingMedia(items);
  const present = new Set(stubbed.present);
  const writable = items.filter((item) =>
    present.has(toMediaId(item.media.mediaType, item.media.tmdbId)),
  );

  const existing = await loadExistingLibrary(row.userId);
  const plan = planImport(writable, existing, {
    userId: row.userId,
    importId,
    timeZone,
    now: Date.now(),
  });

  // A retry plans against rows the first attempt wrote, so keep the first
  // attempt's counts: they describe what the import added.
  if (!row.report) {
    const report: ImportReport = { ...plan.counts, missingTitles: stubbed.missing };
    await saveImportReport(importId, JSON.stringify(report));
  }

  for (const part of chunk(importPlanWrites(plan), WRITE_BATCH)) await runBatch(part);
  await enqueueMediaDetails(stubbed.created);
  await moveImport(importId, "importing", "done", { items: "" });
}

export async function failImport(importId: string, error: string): Promise<void> {
  await moveImport(importId, "importing", "failed", { error });
}

export async function undoImport(
  userId: string,
  importId: string,
): Promise<Result<void, ImportError>> {
  const row = await findUserImport(userId, importId);
  if (!row) return err({ kind: "not_found" });
  // A failed import may have written some batches before it gave up, so it
  // can be undone like a finished one.
  if (row.state !== "done" && row.state !== "failed") return err({ kind: "wrong_state" });
  await runBatch(undoImportWrites(userId, importId));
  await moveImport(importId, row.state, "undone");
  return ok(undefined);
}

export async function discardImport(
  userId: string,
  importId: string,
): Promise<Result<void, ImportError>> {
  if (await deleteScannedImport(userId, importId)) return ok(undefined);
  const row = await findUserImport(userId, importId);
  return err({ kind: row ? "wrong_state" : "not_found" });
}

function readItems(json: string): ImportItem[] {
  return JSON.parse(json) as ImportItem[];
}

// Stubs every title the catalog lacks. A title whose stub could not be
// written, such as a slug already taken by another title, is reported missing
// and its items are left out.
async function stubMissingMedia(
  items: readonly ImportItem[],
): Promise<{ present: string[]; created: string[]; missing: number }> {
  const refs = new Map<string, ImportItem["media"]>();
  for (const item of items)
    refs.set(toMediaId(item.media.mediaType, item.media.tmdbId), item.media);

  const before = new Set((await findMediaByTmdbIds([...refs.values()])).map((m) => m.id));
  const absent = [...refs].filter(([id]) => !before.has(id)).map(([, ref]) => ref);
  for (const part of chunk(mediaStubsWrite(absent), WRITE_BATCH)) await runBatch(part);

  const after = new Set((await findMediaByTmdbIds([...refs.values()])).map((m) => m.id));
  return {
    present: [...after],
    created: [...after].filter((id) => !before.has(id)),
    missing: refs.size - after.size,
  };
}
