import { beforeEach, describe, expect, it } from "vite-plus/test";
import { resetDb } from "@/test/d1";
import { addMedia, addUser, addWatch } from "@/test/fixtures";
import { TIMELINE_DAYS } from "@/shared/community";
import { getTimelineView } from "./media-timeline";

const NOW = Date.parse("2026-03-31T09:00:00Z");
let mediaId: string;

beforeEach(async () => {
  await resetDb();
  mediaId = await addMedia({ tmdbId: 1 });
  await addUser({ id: "a" });
  await addUser({ id: "b" });
});

describe("getTimelineView", () => {
  it("zero-fills a window that ends today, oldest first", async () => {
    await addWatch({ userId: "a", mediaId, watchedOn: "2026-03-30" });
    await addWatch({ userId: "b", mediaId, watchedOn: "2026-03-30" });
    await addWatch({ userId: "a", mediaId, watchedOn: "2026-03-02" });

    const view = await getTimelineView(mediaId, NOW);

    expect(view.days).toHaveLength(TIMELINE_DAYS);
    expect(view.days[0]).toEqual({ date: "2026-03-02", watches: 1 });
    expect(view.days.at(-2)).toEqual({ date: "2026-03-30", watches: 2 });
    expect(view.days.at(-1)).toEqual({ date: "2026-03-31", watches: 0 });
    expect(view.windowWatches).toBe(3);
  });

  it("counts older plays in viewers and the last day but not in the window", async () => {
    await addWatch({ userId: "a", mediaId, watchedOn: "2026-03-01" });
    await addWatch({ userId: "b", mediaId, watchedOn: "2025-12-25" });

    const view = await getTimelineView(mediaId, NOW);

    expect(view.windowWatches).toBe(0);
    expect(view.viewers).toBe(2);
    expect(view.lastDay).toBe("2026-03-01");
  });

  it("folds a local date past the server's today into the last day", async () => {
    await addWatch({ userId: "a", mediaId, watchedOn: "2026-04-01" });

    const view = await getTimelineView(mediaId, NOW);

    expect(view.days.at(-1)).toEqual({ date: "2026-03-31", watches: 1 });
  });
});
