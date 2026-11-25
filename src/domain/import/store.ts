import { and, eq, notExists, sql } from "drizzle-orm";
import { db } from "void/db";
import { favoriteMedia, imports, libraryEntries, watchEvents } from "@schema";
import { insertChunks, type Statement } from "@/db/kernel";
import type { ImportSource, ImportState } from "@/shared/import";
import type { ExistingLibrary, ImportPlan } from "./plan";
import { playKey } from "./plan";

export type ImportRecord = typeof imports.$inferSelect;

export async function createImport(row: {
  id: string;
  userId: string;
  source: ImportSource;
  items: string;
  summary: string;
}): Promise<void> {
  const now = Date.now();
  await db.insert(imports).values({ ...row, state: "scanned", createdAt: now, updatedAt: now });
}

export async function findImport(importId: string): Promise<ImportRecord | null> {
  const rows = await db.select().from(imports).where(eq(imports.id, importId)).limit(1);
  return rows[0] ?? null;
}

export async function findUserImport(userId: string, importId: string) {
  const row = await findImport(importId);
  return row && row.userId === userId ? row : null;
}

export async function listUserImports(userId: string) {
  return db
    .select({
      id: imports.id,
      source: imports.source,
      state: imports.state,
      summary: imports.summary,
      report: imports.report,
      error: imports.error,
      createdAt: imports.createdAt,
    })
    .from(imports)
    .where(eq(imports.userId, userId))
    .orderBy(sql`${imports.createdAt} desc`);
}

// Moves an import from one state to another. Returns false when the row was
// not in the expected state, so two requests cannot both start or undo it.
export async function moveImport(
  importId: string,
  from: ImportState,
  to: ImportState,
  fields: { items?: string; report?: string; error?: string | null } = {},
): Promise<boolean> {
  const rows = await db
    .update(imports)
    .set({ ...fields, state: to, updatedAt: Date.now() })
    .where(and(eq(imports.id, importId), eq(imports.state, from)))
    .returning({ id: imports.id });
  return rows.length > 0;
}

export async function saveImportReport(importId: string, report: string): Promise<void> {
  await db.update(imports).set({ report, updatedAt: Date.now() }).where(eq(imports.id, importId));
}

export async function loadExistingLibrary(userId: string): Promise<ExistingLibrary> {
  const [plays, entries, favorites] = await Promise.all([
    db
      .select({
        mediaId: watchEvents.mediaId,
        seasonNumber: watchEvents.seasonNumber,
        episodeNumber: watchEvents.episodeNumber,
        watchedAt: watchEvents.watchedAt,
      })
      .from(watchEvents)
      .where(eq(watchEvents.userId, userId)),
    db.select().from(libraryEntries).where(eq(libraryEntries.userId, userId)),
    db
      .select({ mediaId: favoriteMedia.mediaId })
      .from(favoriteMedia)
      .where(eq(favoriteMedia.userId, userId)),
  ]);
  return {
    playKeys: new Set(
      plays.map((p) => playKey(p.mediaId, p.seasonNumber, p.episodeNumber, p.watchedAt)),
    ),
    entries: new Map(entries.map((entry) => [entry.mediaId, entry])),
    favorites: new Set(favorites.map((f) => f.mediaId)),
  };
}

// Entries first: the library lists titles through them. An updated entry keeps
// its own import id, so undo never removes an entry the user made.
export function importPlanWrites(plan: ImportPlan): Statement[] {
  return [
    ...insertChunks(plan.entries, (part) =>
      db
        .insert(libraryEntries)
        .values(part)
        .onConflictDoUpdate({
          target: [libraryEntries.userId, libraryEntries.mediaId],
          set: {
            filedStatus: sql`excluded.filed_status`,
            score100: sql`excluded.score100`,
            notes: sql`excluded.notes`,
            updatedAt: sql`excluded.updated_at`,
          },
        }),
    ),
    ...insertChunks(plan.plays, (part) => db.insert(watchEvents).values(part)),
    ...insertChunks(plan.favorites, (part) =>
      db.insert(favoriteMedia).values(part).onConflictDoNothing(),
    ),
  ];
}

// Removes what the import added. An entry the import created stays when the
// user has since logged a play of their own for it. Scores and statuses the
// import filled into the user's existing entries stay.
export function undoImportWrites(userId: string, importId: string): Statement[] {
  return [
    db
      .delete(watchEvents)
      .where(and(eq(watchEvents.userId, userId), eq(watchEvents.importId, importId))),
    db
      .delete(favoriteMedia)
      .where(and(eq(favoriteMedia.userId, userId), eq(favoriteMedia.importId, importId))),
    db.delete(libraryEntries).where(
      and(
        eq(libraryEntries.userId, userId),
        eq(libraryEntries.importId, importId),
        notExists(
          db
            .select({ id: watchEvents.id })
            .from(watchEvents)
            .where(
              and(
                eq(watchEvents.userId, libraryEntries.userId),
                eq(watchEvents.mediaId, libraryEntries.mediaId),
              ),
            ),
        ),
      ),
    ),
  ];
}
