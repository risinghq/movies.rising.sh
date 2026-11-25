import { describe, expect, it } from "vite-plus/test";
import { openingSeason, watchedBySeason } from "./tracking";

const seasons = [
  { seasonNumber: 0, episodeCount: 3 },
  { seasonNumber: 1, episodeCount: 2 },
  { seasonNumber: 2, episodeCount: 2 },
];

describe("openingSeason", () => {
  it("opens the first regular season for a new viewer", () => {
    expect(openingSeason(seasons, [])).toBe(1);
  });

  it("opens the first regular season with an unwatched episode", () => {
    expect(openingSeason(seasons, ["1:1", "1:2", "2:1"])).toBe(2);
  });

  it("falls back to the first regular season when every one is watched", () => {
    expect(openingSeason(seasons, ["1:1", "1:2", "2:1", "2:2"])).toBe(1);
  });

  it("opens specials when a show has nothing else", () => {
    expect(openingSeason([{ seasonNumber: 0, episodeCount: 1 }], [])).toBe(0);
  });

  it("returns null for a show with no seasons", () => {
    expect(openingSeason([], [])).toBeNull();
  });
});

describe("watchedBySeason", () => {
  it("counts watched episodes per season", () => {
    expect(watchedBySeason(["1:1", "1:2", "10:4"])).toEqual(
      new Map([
        [1, 2],
        [10, 1],
      ]),
    );
  });
});
