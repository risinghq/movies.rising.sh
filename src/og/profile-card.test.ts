import { describe, expect, it } from "vite-plus/test";
import type { ProfileCardModel } from "@/domain/profile-card";
import { profileCard, profileCardPath, profileCardVersion } from "./profile-card";
import type { OgChild } from "./render";

function card(overrides: Partial<ProfileCardModel> = {}): ProfileCardModel {
  const format = { tracked: 0 };
  return {
    identity: {
      displayName: "Ada Lovelace",
      username: "ada",
      avatarEmoji: "🎬",
      avatarColor: null,
      joinedAt: 0,
    },
    averageScore: null,
    stats: {
      tracked: 3,
      watchDays: 1,
      averageScore100: null,
      byFormat: { movie: { ...format, tracked: 2 }, show: { ...format, tracked: 1 } },
    },
    activity: { calendar: [] },
    favorites: {
      media: ["/a.jpg", null, "/b.jpg"].map((posterPath, i) => ({
        mediaId: `m${i}`,
        media: { posterPath },
      })),
      people: [],
    },
    ...overrides,
  } as unknown as ProfileCardModel;
}

function texts(node: OgChild | OgChild[] | undefined): string[] {
  if (node == null) return [];
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(texts);
  return texts(node.props.children);
}

function images(node: OgChild | OgChild[] | undefined): string[] {
  if (node == null || typeof node === "string") return [];
  if (Array.isArray(node)) return node.flatMap(images);
  const own = node.type === "img" ? [String(node.props.src)] : [];
  return [...own, ...images(node.props.children)];
}

describe("profileCardVersion", () => {
  it("changes when the card draws something new", () => {
    const base = card();
    expect(profileCardVersion(card({ averageScore: "8.1" }))).not.toBe(profileCardVersion(base));
    const renamed = card({ identity: { ...base.identity, displayName: "Ada" } });
    expect(profileCardVersion(renamed)).not.toBe(profileCardVersion(base));
  });

  it("ignores what the card does not draw", () => {
    const busy = card({ activity: { calendar: [{ date: "2026-11-01", count: 2 }] } as never });
    expect(profileCardVersion(busy)).toBe(profileCardVersion(card()));
  });
});

describe("profileCardPath", () => {
  it("points at the image route with the version", () => {
    expect(profileCardPath(card())).toBe(`/og/u/ada?v=${profileCardVersion(card())}`);
  });
});

describe("profileCard", () => {
  it("draws the user, the stats and the posters that exist", () => {
    const tree = profileCard(card());
    expect(texts(tree)).toEqual(
      expect.arrayContaining(["🎬", "Ada Lovelace", "@ada", "3", "tracked", "2 movies · 1 show"]),
    );
    expect(texts(tree)).not.toContain("avg");
    expect(images(tree)).toEqual([
      "https://image.tmdb.org/t/p/w185/a.jpg",
      "https://image.tmdb.org/t/p/w185/b.jpg",
    ]);
  });

  it("shows the average when the profile rates", () => {
    expect(texts(profileCard(card({ averageScore: "8.1" })))).toEqual(
      expect.arrayContaining(["8.1", "avg"]),
    );
  });
});
