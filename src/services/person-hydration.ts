import { logger } from "void/log";
import { fetchPersonDetail, tmdbToken } from "@/integrations/tmdb";
import {
  findPersonBySlug,
  markPersonDetailsFailedWrite,
  personScalarsWrite,
  personStubsWrite,
  type PersonRecord,
} from "@/domain/catalog/people";
import { runBatch } from "@/db/kernel";
import { DETAILS_TTL_MS, hydrationState, summarizeCause } from "@/domain/hydration";
import { attempt } from "@/result";
import { slugify } from "@/shared/slug";
import type { FilmographyEntry, PersonCrewEntry } from "@/shared/types/metadata";

export type PersonView = {
  person: PersonRecord;
  acting: FilmographyEntry[];
  crew: PersonCrewEntry[];
};

/** A stored person, or one TMDB knows by the id that ends the slug. Search
 * links to people no credit has stored yet; the TMDB fetch is edge-cached, so
 * ensurePersonDetails reads it again for free. */
export async function loadPerson(slug: string): Promise<PersonRecord | null> {
  const stored = await findPersonBySlug(slug);
  if (stored) return stored;

  const tmdbId = Number(slug.slice(slug.lastIndexOf("-") + 1));
  if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0 || !tmdbToken()) return null;
  const fetched = await attempt(fetchPersonDetail(tmdbId), (cause) => cause);
  if (!fetched.ok) return null;

  const { scalars } = fetched.value;
  if (slugify(scalars.name, tmdbId) !== slug) return null;
  await runBatch(personStubsWrite([{ tmdbId, ...scalars }]));
  return findPersonBySlug(slug);
}

export async function ensurePersonDetails(person: PersonRecord): Promise<PersonView> {
  if (!tmdbToken()) return { person, acting: [], crew: [] };

  const fetched = await attempt(fetchPersonDetail(person.tmdbId), (cause) => cause);
  if (!fetched.ok) {
    logger.warn("person details hydration failed", { personId: person.id, cause: fetched.error });
    // Best-effort: recording the failure must not throw into the loader.
    const marked = await attempt(
      runBatch(markPersonDetailsFailedWrite(person.id, summarizeCause(fetched.error))),
      (cause) => cause,
    );
    if (!marked.ok) {
      logger.warn("failed to record person hydration error", {
        personId: person.id,
        cause: marked.error,
      });
    }
    return { person, acting: [], crew: [] };
  }

  const detail = fetched.value;
  // Fresh stored scalars are what a refresh would write, so a view skips the
  // write and the re-read. The filmography is never stored and always comes
  // from the fetch.
  if (hydrationState(person.detailsHydratedAt, person.detailsError, DETAILS_TTL_MS) === "fresh") {
    return { person, acting: detail.acting, crew: detail.crew };
  }
  const written = await attempt(
    runBatch(personScalarsWrite(person.id, detail.scalars)),
    (cause) => cause,
  );
  if (!written.ok) {
    logger.warn("person scalars persist failed", { personId: person.id, cause: written.error });
  }
  const refreshed = (await findPersonBySlug(person.slug)) ?? person;
  return { person: refreshed, acting: detail.acting, crew: detail.crew };
}
