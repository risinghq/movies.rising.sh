import { defineHandler } from "void";
import type { InferProps } from "void";
import { getMediaStats } from "@/domain/insights/title-stats";
import { getTimelineView } from "@/domain/tracking/media-timeline";
import { loadMedia } from "@/services/media-hydration";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const item = await loadMedia(c.req.param("slug") as string);
  if (!item) return c.notFound();

  const [timeline, stats] = await Promise.all([
    getTimelineView(item.id),
    getMediaStats(item.id, item.mediaType),
  ]);
  return { media: item, timeline, stats };
});
