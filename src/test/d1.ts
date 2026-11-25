import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { afterAll } from "vite-plus/test";
import * as schema from "@schema";

// Under Vitest, `void/db` resolves here (see vite.config.ts): a real D1 in
// workerd, migrated from db/migrations, with the same drizzle driver the Worker
// uses. Batches and D1's 100-parameter cap behave as in production. Each test
// file runs in its own module scope, so each gets its own empty database.

const MIGRATIONS = new URL("../../db/migrations/", import.meta.url);

// Miniflare keeps D1 in a SQLite file, syncs it on every commit and has no
// in-memory mode. With the temp directory on disk one insert costs about 50 ms,
// enough to push a seeding test past Vitest's timeout. The database is thrown
// away, so it lives on tmpfs where the platform has one.
const storage = mkdtempSync(join(existsSync("/dev/shm") ? "/dev/shm" : tmpdir(), "movies-d1-"));

// Void builds its own Miniflare the same way, from v4-shaped options.
const miniflare = new Miniflare({
  ...convertV4MiniflareOptions({
    modules: true,
    script: "export default {}",
    compatibilityDate: "2026-11-01",
    d1Databases: { DB: "test" },
  }),
  resourcePersistencePath: storage,
});
const d1 = await miniflare.getD1Database("DB");
await migrate();

export const db = drizzle(d1, { schema });

afterAll(async () => {
  await miniflare.dispose();
  rmSync(storage, { recursive: true, force: true });
});

async function migrate() {
  const files = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const statements = readFileSync(new URL(file, MIGRATIONS), "utf8")
      .split("--> statement-breakpoint")
      .map((sql) => sql.trim())
      .filter(Boolean);
    if (statements.length > 0) await d1.batch(statements.map((sql) => d1.prepare(sql)));
  }
}

// Empties every app table. Foreign keys are checked at commit, so the delete
// order does not matter.
export async function resetDb() {
  const { results } = await d1
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
    )
    .all<{ name: string }>();
  await d1.batch([
    d1.prepare("PRAGMA defer_foreign_keys = ON"),
    ...results.map(({ name }) => d1.prepare(`DELETE FROM "${name}"`)),
  ]);
}
