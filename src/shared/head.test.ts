import { describe, expect, it } from "vite-plus/test";
import { clipDescription, mediaHead, pageHead, SITE_DESCRIPTION } from "./head";

function meta(head: ReturnType<typeof pageHead>, key: string) {
  return head.meta?.find((m) => m.name === key || m.property === key)?.content;
}

const movie = {
  title: "Arrival",
  mediaType: "movie" as const,
  overview: "A linguist works with the military to talk to alien visitors.",
  releaseDate: "2016-11-10",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
};

describe("pageHead", () => {
  it("suffixes the title and falls back to the site description", () => {
    const head = pageHead({ title: "search" });
    expect(head.title).toBe("search · track");
    expect(meta(head, "og:title")).toBe("search");
    expect(meta(head, "description")).toBe(SITE_DESCRIPTION);
    expect(meta(head, "og:image")).toBeUndefined();
    expect(meta(head, "robots")).toBeUndefined();
  });

  it("marks a page noindex on request", () => {
    expect(meta(pageHead({ title: "settings", noindex: true }), "robots")).toBe("noindex");
  });
});

describe("mediaHead", () => {
  it("names the year and prefers the wide backdrop", () => {
    const head = mediaHead(movie);
    expect(head.title).toBe("Arrival (2016) · track");
    expect(meta(head, "og:type")).toBe("video.movie");
    expect(meta(head, "og:image")).toBe("https://image.tmdb.org/t/p/w1280/backdrop.jpg");
    expect(meta(head, "twitter:image")).toBe(meta(head, "og:image"));
  });

  it("falls back to the poster and names the tab", () => {
    const head = mediaHead({ ...movie, mediaType: "show", backdropPath: null }, "cast");
    expect(head.title).toBe("Arrival (2016) cast · track");
    expect(meta(head, "og:type")).toBe("video.tv_show");
    expect(meta(head, "og:image")).toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
  });
});

describe("clipDescription", () => {
  it("collapses whitespace and drops empty text", () => {
    expect(clipDescription("  two\n\nlines ")).toBe("two lines");
    expect(clipDescription("   ")).toBeNull();
    expect(clipDescription(null)).toBeNull();
  });

  it("cuts long text at a word inside the limit", () => {
    const clipped = clipDescription("word ".repeat(60)) ?? "";
    expect(clipped.length).toBeLessThanOrEqual(160);
    expect(clipped.endsWith("word…")).toBe(true);
  });
});
