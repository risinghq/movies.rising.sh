import { logger } from "void/log";
import { readTmdb } from "@/domain/import/tmdb";
import {
  TMDB_APPROVE_URL,
  createTmdbAccessToken,
  createTmdbRequestToken,
  fetchTmdbAccountLists,
  revokeTmdbAccessToken,
  tmdbToken,
} from "@/integrations/tmdb";
import { attempt, err, ok, type Result } from "@/result";
import type { ImportSummary } from "@/shared/import";
import { importErrorStatus, stageImport, type ImportError } from "./import";

export type TmdbImportError =
  | ImportError
  | { kind: "source_unavailable" }
  | { kind: "not_approved" };

export function tmdbImportErrorStatus(error: TmdbImportError): 400 | 404 | 409 | 413 | 502 {
  if (error.kind === "source_unavailable") return 502;
  if (error.kind === "not_approved") return 400;
  return importErrorStatus(error);
}

// Returns the TMDB page where the user approves read access. TMDB sends them
// back to `returnTo` with the same request token.
export async function connectTmdb(
  returnTo: string,
): Promise<Result<{ approveUrl: string; requestToken: string }, TmdbImportError>> {
  if (!tmdbToken()) return err({ kind: "source_unavailable" });
  const created = await attempt(createTmdbRequestToken(returnTo), (cause) => cause);
  if (!created.ok) {
    logger.warn("TMDB request token failed", { cause: created.error });
    return err({ kind: "source_unavailable" });
  }
  const approveUrl = `${TMDB_APPROVE_URL}?request_token=${encodeURIComponent(created.value)}`;
  return ok({ approveUrl, requestToken: created.value });
}

// Reads the approved account and stages it. The access token lives only for
// this call: it is revoked before the call returns and never stored.
export async function scanTmdb(
  userId: string,
  requestToken: string,
): Promise<Result<{ id: string; summary: ImportSummary }, TmdbImportError>> {
  const access = await attempt(createTmdbAccessToken(requestToken), (cause) => cause);
  if (!access.ok) {
    logger.warn("TMDB access token failed", { cause: access.error });
    return err({ kind: "source_unavailable" });
  }
  if (!access.value) return err({ kind: "not_approved" });

  const lists = await attempt(fetchTmdbAccountLists(access.value), (cause) => cause);
  await revokeTmdbAccessToken(access.value.accessToken).catch((cause: unknown) =>
    logger.warn("TMDB access token revoke failed", { cause }),
  );
  if (!lists.ok) {
    logger.warn("TMDB account read failed", { cause: lists.error });
    return err({ kind: "source_unavailable" });
  }
  return stageImport(userId, "tmdb", readTmdb(lists.value));
}
