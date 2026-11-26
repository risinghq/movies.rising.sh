import type { ExportFile } from "@/domain/import/letterboxd";
import { readImdb } from "@/domain/import/imdb";
import { readLetterboxd } from "@/domain/import/letterboxd";
import type { ConnectedSource, FileSource } from "@/shared/import";

export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string };

async function post<T>(url: string, body: unknown = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: { kind?: string } };
    if (!res.ok) return { ok: false, error: payload.error?.kind ?? `http_${res.status}` };
    return { ok: true, value: payload as T };
  } catch {
    return { ok: false, error: "network" };
  }
}

type Staged = { id: string };

// The browser holds what a source's approval page must hand back to the scan:
// Trakt's state and code verifier, or TMDB's request token. sessionStorage
// keeps it to this tab and drops it when the tab closes.
const PENDING_KEY = "import:pending";

type Pending =
  | { source: "trakt"; state: string; verifier: string }
  | { source: "tmdb"; requestToken: string };

export function takePending<S extends ConnectedSource>(
  source: S,
): Extract<Pending, { source: S }> | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  if (!raw) return null;
  const pending = JSON.parse(raw) as Pending;
  return pending.source === source ? (pending as Extract<Pending, { source: S }>) : null;
}

export async function connectSource(source: ConnectedSource): Promise<ApiResult<string>> {
  if (source === "trakt") {
    const res = await post<{ authorizeUrl: string; state: string; verifier: string }>(
      "/api/imports/trakt/connect",
    );
    if (!res.ok) return res;
    const { state, verifier } = res.value;
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ source, state, verifier }));
    return { ok: true, value: res.value.authorizeUrl };
  }
  const res = await post<{ approveUrl: string; requestToken: string }>("/api/imports/tmdb/connect");
  if (!res.ok) return res;
  sessionStorage.setItem(
    PENDING_KEY,
    JSON.stringify({ source, requestToken: res.value.requestToken }),
  );
  return { ok: true, value: res.value.approveUrl };
}

export function scanTrakt(code: string, verifier: string): Promise<ApiResult<Staged>> {
  return post("/api/imports/trakt/scan", { code, verifier });
}

export function scanTmdb(requestToken: string): Promise<ApiResult<Staged>> {
  return post("/api/imports/tmdb/scan", { requestToken });
}

export function scanAnilist(username: string): Promise<ApiResult<Staged>> {
  return post("/api/imports/anilist/scan", { username });
}

// Reads the export in the browser and sends only the titles and entries, so
// the rest of the export (a Letterboxd profile's email, reviews) stays here.
export async function scanExport(source: FileSource, files: File[]): Promise<ApiResult<Staged>> {
  const read = await readExportFiles(files).catch(() => null);
  if (!read) return { ok: false, error: "unreadable_file" };
  const scan = source === "letterboxd" ? readLetterboxd(read) : readImdb(read);
  if (scan.titles.length === 0) return { ok: false, error: `no_${source}_rows` };
  return post("/api/imports/file", { source, scan });
}

async function readExportFiles(files: File[]): Promise<ExportFile[]> {
  const read: ExportFile[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      read.push({ name: file.name, text: await file.text() });
      continue;
    }
    const { unzipSync, strFromU8 } = await import("fflate");
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (entry) => entry.name.toLowerCase().endsWith(".csv"),
    });
    for (const [name, data] of Object.entries(entries)) read.push({ name, text: strFromU8(data) });
  }
  return read;
}

export function startImport(id: string, undatedDays: string[]): Promise<ApiResult<unknown>> {
  return post(`/api/imports/${id}/start`, { undatedDays });
}

export function undoImport(id: string): Promise<ApiResult<unknown>> {
  return post(`/api/imports/${id}/undo`);
}

export async function importState(id: string): Promise<string | null> {
  const res = await fetch("/api/imports").catch(() => null);
  if (!res?.ok) return null;
  const body = (await res.json()) as { imports: { id: string; state: string }[] };
  return body.imports.find((i) => i.id === id)?.state ?? null;
}

const MESSAGES: Record<string, string> = {
  source_unavailable: "the source is not answering. try again in a minute.",
  not_approved: "access was not granted. connect again and approve it.",
  unknown_user: "no public AniList profile has that name. check it, or make your list public.",
  empty: "this account has nothing to import.",
  too_large: "this history is larger than one import holds (about 15,000 plays).",
  wrong_state: "this import has already moved on. reload the page.",
  not_found: "this import no longer exists.",
  network: "the request did not reach the server. check your connection.",
  state_mismatch: "this sign-in did not start here. connect again from the import page.",
  unreadable_file: "that file could not be read. choose the ZIP or CSV the site gave you.",
  no_letterboxd_rows: "no films found. choose the ZIP from letterboxd.com/settings/data.",
  no_imdb_rows: "no titles found. choose the ratings or watchlist CSV from IMDb.",
  too_many_titles: "this export has more than 3,000 titles, more than one import matches.",
  invalid_payload: "that file did not read as an export. choose the file the site gave you.",
};

export function importMessage(kind: string): string {
  return MESSAGES[kind] ?? "something went wrong. try again.";
}
