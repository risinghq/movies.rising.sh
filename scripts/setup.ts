// Loads the committed catalog fixtures into the database. The default target is
// the local database, after applying migrations. `--remote` seeds the deployed
// D1 database instead; `void deploy` has already applied its migrations.
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const remote = process.argv.includes("--remote");

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd: root });
}

function esc(v: string | null | undefined): string {
  if (v == null) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

function num(v: number | null | undefined): string {
  return v == null ? "NULL" : String(v);
}

type MediaFixture = {
  id: string;
  mediaType: string;
  tmdbId: number;
  slug: string;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  seasonCount?: number | null;
  episodeCount?: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
};

function catalogStatements(now: number): string[] {
  const media = JSON.parse(
    readFileSync(join(root, "db/fixtures/media.json"), "utf8"),
  ) as MediaFixture[];

  return media.map(
    (m) =>
      `INSERT OR IGNORE INTO media (id, tmdb_id, media_type, slug, title, original_title, overview, poster_path, backdrop_path, release_date, season_count, episode_count, vote_average, vote_count, popularity, created_at, updated_at) ` +
      `VALUES (${esc(m.id)}, ${m.tmdbId}, ${esc(m.mediaType)}, ${esc(m.slug)}, ${esc(m.title)}, ${esc(m.originalTitle)}, ${esc(m.overview)}, ${esc(m.posterPath)}, ${esc(m.backdropPath)}, ${esc(m.releaseDate)}, ${num(m.seasonCount)}, ${num(m.episodeCount)}, ${num(m.voteAverage)}, ${num(m.voteCount)}, ${num(m.popularity)}, ${now}, ${now});`,
  );
}

function main() {
  const now = Date.now();
  const lines = catalogStatements(now);

  if (!remote) {
    console.log("▶ applying migrations...");
    run("vp exec void db migrate");
  }

  const tempDir = join(root, "tmp");
  mkdirSync(tempDir, { recursive: true });
  const sqlPath = `tmp/track-seed-${now}.sql`;
  const sqlFile = join(root, sqlPath);
  writeFileSync(sqlFile, lines.join("\n"));

  try {
    console.log(`▶ seeding catalog (${lines.length} items)${remote ? " remotely" : ""}...`);
    run(`vp exec void db execute${remote ? " --remote" : ""} --file "${sqlPath}"`);
  } finally {
    rmSync(sqlFile, { force: true });
  }

  console.log("✓ ready");
}

try {
  main();
} catch (err) {
  process.stderr.write(`setup failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
