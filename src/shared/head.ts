import type { HeadDescriptor } from "void";
import { yearOf } from "./format-media";
import { tmdbImage } from "./tmdb-image";

export const SITE_NAME = "track";
export const SITE_DESCRIPTION =
  "Search any film or show, log episodes, and keep a personal history of everything you've seen.";

// Search engines show about 160 characters of a description.
const DESCRIPTION_LIMIT = 160;

export type PageHeadInput = {
  title: string;
  description?: string | null;
  /** Absolute, or a site path that Void makes absolute for crawlers. */
  image?: string | null;
  type?: "website" | "profile" | "video.movie" | "video.tv_show";
  noindex?: boolean;
};

export function pageHead(input: PageHeadInput): HeadDescriptor {
  const title = `${input.title} · ${SITE_NAME}`;
  const description = clipDescription(input.description) ?? SITE_DESCRIPTION;
  const meta: NonNullable<HeadDescriptor["meta"]> = [
    { name: "description", content: description },
    { property: "og:title", content: input.title },
    { property: "og:description", content: description },
    { property: "og:type", content: input.type ?? "website" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: description },
  ];
  if (input.image) {
    meta.push(
      { property: "og:image", content: input.image },
      { name: "twitter:image", content: input.image },
    );
  }
  if (input.noindex) meta.push({ name: "robots", content: "noindex" });
  return { title, meta };
}

type MediaHeadSource = {
  title: string;
  mediaType: "movie" | "show";
  overview: string | null;
  releaseDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
};

/** A title page's head; `section` names a tab such as "cast". */
export function mediaHead(media: MediaHeadSource, section?: string): HeadDescriptor {
  const year = yearOf(media.releaseDate);
  const name = year ? `${media.title} (${year})` : media.title;
  // Link previews crop to a wide frame, so the backdrop fits better than the poster.
  const image = media.backdropPath
    ? tmdbImage(media.backdropPath, "w1280")
    : media.posterPath
      ? tmdbImage(media.posterPath, "w500")
      : null;
  return pageHead({
    title: section ? `${name} ${section}` : name,
    description: media.overview,
    image,
    type: media.mediaType === "movie" ? "video.movie" : "video.tv_show",
  });
}

export function clipDescription(text: string | null | undefined): string | null {
  const flat = text?.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  if (flat.length <= DESCRIPTION_LIMIT) return flat;
  const cut = flat.slice(0, DESCRIPTION_LIMIT - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > DESCRIPTION_LIMIT / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
