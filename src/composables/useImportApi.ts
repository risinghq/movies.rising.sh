import type { ImportSource } from "@/shared/import";

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

export function takePending<S extends ImportSource>(
  source: S,
): Extract<Pending, { source: S }> | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  if (!raw) return null;
  const pending = JSON.parse(raw) as Pending;
  return pending.source === source ? (pending as Extract<Pending, { source: S }>) : null;
}

export async function connectSource(source: ImportSource): Promise<ApiResult<string>> {
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
  empty: "this account has nothing to import.",
  too_large: "this history is larger than one import holds (about 15,000 plays).",
  wrong_state: "this import has already moved on. reload the page.",
  not_found: "this import no longer exists.",
  network: "the request did not reach the server. check your connection.",
  state_mismatch: "this sign-in did not start here. connect again from the import page.",
};

export function importMessage(kind: string): string {
  return MESSAGES[kind] ?? "something went wrong. try again.";
}
