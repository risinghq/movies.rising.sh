import { beforeEach, describe, expect, it } from "vite-plus/test";
import { resetDb } from "@/test/d1";
import { addMedia } from "@/test/fixtures";
import { runBatch } from "@/db/kernel";
import { findMedia } from "@/domain/catalog/media";
import { listSeasonEpisodes, mediaEpisodesWrite } from "@/domain/catalog/episodes";
import { buildShowView } from "./show-view";

const episode = (seasonNumber: number, episodeNumber: number) => ({
  seasonNumber,
  episodeNumber,
  name: `S${seasonNumber}E${episodeNumber}`,
  runtime: 24,
  airDate: "2020-01-01",
});

let mediaId: string;

beforeEach(async () => {
  await resetDb();
  mediaId = await addMedia({ mediaType: "show", tmdbId: 1 });
  await runBatch(
    mediaEpisodesWrite(mediaId, [
      episode(1, 1),
      episode(1, 2),
      episode(2, 1),
      episode(2, 2),
      episode(2, 3),
    ]),
  );
});

describe("buildShowView", () => {
  it("summarizes every season and carries the episodes of the first one only", async () => {
    const media = await findMedia(mediaId);
    if (!media.ok) throw new Error("media missing");

    const view = await buildShowView(null, media.value);

    expect(view.seasons).toEqual([
      { seasonNumber: 1, episodeCount: 2 },
      { seasonNumber: 2, episodeCount: 3 },
    ]);
    expect(view.openSeason).toEqual({ seasonNumber: 1, episodes: [episode(1, 1), episode(1, 2)] });
  });
});

describe("listSeasonEpisodes", () => {
  it("returns one season in episode order", async () => {
    expect(await listSeasonEpisodes(mediaId, 2)).toEqual([
      episode(2, 1),
      episode(2, 2),
      episode(2, 3),
    ]);
  });
});
