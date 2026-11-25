import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { mediaHead } from "@/shared/head";
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

export const head = defineHead<Props>((_c, props) => mediaHead(props.media, "community"));
