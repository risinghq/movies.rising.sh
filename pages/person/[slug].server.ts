import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { pageHead } from "@/shared/head";
import { slugify } from "@/shared/slug";
import { tmdbImage } from "@/shared/tmdb-image";
import { getUser } from "void/auth";
import { findMediaByTmdbIds } from "@/domain/catalog/media";
import { groupByDepartment } from "@/domain/catalog/credits";
import { isPersonFavorited } from "@/domain/tracking/favorites";
import { watchedMediaIds } from "@/domain/tracking/watch-events";
import { ensurePersonDetails, loadPerson } from "@/services/person-hydration";
import type { FilmographyEntry, FilmographyView } from "@/shared/types/metadata";

export type Props = InferProps<typeof loader>;

// A director's page opens on directing: TMDB's known-for department leads,
// and the rest keep their order.
function knownForFirst<T extends { department: string }>(
  sections: T[],
  knownFor: string | null,
): T[] {
  const lead = sections.find((s) => s.department === knownFor);
  return lead ? [lead, ...sections.filter((s) => s !== lead)] : sections;
}

// TMDB lists one credit per job or role, so a writer-producer's film shows up
// twice in a department. Keep one card that names every job.
function mergeByTitle(items: FilmographyView[]): FilmographyView[] {
  const bySlug = new Map<string, FilmographyView>();
  for (const item of items) {
    const seen = bySlug.get(item.slug);
    if (!seen) bySlug.set(item.slug, item);
    else if (item.subtitle && item.subtitle !== seen.subtitle) {
      const subtitle = seen.subtitle ? `${seen.subtitle}, ${item.subtitle}` : item.subtitle;
      bySlug.set(item.slug, { ...seen, subtitle });
    }
  }
  return [...bySlug.values()];
}

export const loader = defineHandler(async (c) => {
  const slug = c.req.param("slug") as string;
  const user = getUser();

  const existing = await loadPerson(slug);
  if (!existing) return c.notFound();

  const [{ person, acting, crew }, isFavorited] = await Promise.all([
    ensurePersonDetails(existing),
    user ? isPersonFavorited(user.id, existing.id) : false,
  ]);

  const entries = [...acting, ...crew];
  const catalogRows =
    entries.length > 0
      ? await findMediaByTmdbIds(entries.map((e) => ({ mediaType: e.mediaType, tmdbId: e.tmdbId })))
      : [];
  const rowByKey = new Map(catalogRows.map((r) => [`${r.mediaType}:${r.tmdbId}`, r]));
  const watched = user
    ? await watchedMediaIds(
        user.id,
        catalogRows.map((r) => r.id),
      )
    : new Set<string>();

  const toView = (e: FilmographyEntry): FilmographyView => {
    const row = rowByKey.get(`${e.mediaType}:${e.tmdbId}`);
    return {
      key: e.creditId,
      title: e.title,
      subtitle: e.subtitle,
      year: e.date ? e.date.slice(0, 4) : null,
      posterPath: e.posterPath,
      // A title outside the catalog links by its TMDB slug; the title page
      // caches it on first visit.
      slug: row?.slug ?? slugify(e.title, e.tmdbId),
      seen: row ? watched.has(row.id) : false,
    };
  };

  const sections = knownForFirst(
    [
      { department: "Acting", items: mergeByTitle(acting.map(toView)) },
      ...groupByDepartment(crew).map(({ department, members }) => ({
        department,
        items: mergeByTitle(members.map(toView)),
      })),
    ].filter((s) => s.items.length > 0),
    person.knownForDepartment,
  );

  return {
    person: {
      id: person.id,
      name: person.name,
      profilePath: person.profilePath,
      gender: person.gender,
      knownForDepartment: person.knownForDepartment,
      birthday: person.birthday,
      deathday: person.deathday,
      placeOfBirth: person.placeOfBirth,
      biography: person.biography,
    },
    sections,
    isFavorited,
    user: user ?? null,
  };
});

export const head = defineHead<Props>((_c, { person }) =>
  pageHead({
    title: person.name,
    description: person.biography,
    image: person.profilePath ? tmdbImage(person.profilePath, "w500") : null,
    type: "profile",
  }),
);
