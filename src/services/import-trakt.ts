import { logger } from "void/log";
import { readTrakt } from "@/domain/import/trakt";
import {
  createTraktAccessToken,
  createTraktPkce,
  fetchTraktExport,
  revokeTraktAccessToken,
  traktAuthorizeUrl,
} from "@/integrations/trakt";
import { attempt, err, ok, type Result } from "@/result";
import type { ImportSummary } from "@/shared/import";
import { stageImport, type ConnectedImportError } from "./import";

export type TraktConnect = { authorizeUrl: string; state: string; verifier: string };

// Starts Trakt's PKCE sign-in. The client keeps `state` and `verifier` across
// Trakt's page: it checks `state` on return and posts `verifier` with the code.
// A code is worthless without its verifier.
export async function connectTrakt(
  redirectUri: string,
): Promise<Result<TraktConnect, ConnectedImportError>> {
  const pkce = await createTraktPkce();
  const state = crypto.randomUUID();
  const authorizeUrl = traktAuthorizeUrl({ redirectUri, state, challenge: pkce.challenge });
  if (!authorizeUrl) return err({ kind: "source_unavailable" });
  return ok({ authorizeUrl, state, verifier: pkce.verifier });
}

// Reads the approved account and stages it. The access token lives only for
// this call: it is revoked before the call returns and never stored.
export async function scanTrakt(
  userId: string,
  input: { code: string; verifier: string; redirectUri: string },
): Promise<Result<{ id: string; summary: ImportSummary }, ConnectedImportError>> {
  const token = await attempt(createTraktAccessToken(input), (cause) => cause);
  if (!token.ok) {
    logger.warn("Trakt token exchange failed", { cause: token.error });
    return err({ kind: "source_unavailable" });
  }
  if (!token.value) return err({ kind: "not_approved" });

  const data = await attempt(fetchTraktExport(token.value), (cause) => cause);
  await revokeTraktAccessToken(token.value).catch((cause: unknown) =>
    logger.warn("Trakt access token revoke failed", { cause }),
  );
  if (!data.ok) {
    logger.warn("Trakt account read failed", { cause: data.error });
    return err({ kind: "source_unavailable" });
  }
  return stageImport(userId, "trakt", readTrakt(data.value));
}

// The token exchange must send the exact redirect URI of the authorize step,
// and Trakt accepts only URIs registered on the app.
export function traktRedirectUri(requestUrl: string): string {
  return `${new URL(requestUrl).origin}/import/trakt/callback`;
}
