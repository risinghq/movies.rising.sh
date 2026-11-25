<script setup lang="ts">
import { computed } from "vue";
import type { MediaStats } from "@/domain/insights/title-stats";
import type { MediaTimelineView } from "@/domain/tracking/media-timeline";
import { countText, STATS_MIN_SCORES, STATS_MIN_TRACKED, TIMELINE_DAYS } from "@/shared/community";

const props = defineProps<{ timeline: MediaTimelineView; stats: MediaStats }>();

type Cell = { label: string; value: string; star?: boolean };

const cells = computed(() => {
  const { timeline, stats } = props;
  const list: Cell[] = [
    { label: `watches · ${TIMELINE_DAYS} days`, value: countText(timeline.windowWatches) },
    { label: "viewers", value: countText(timeline.viewers) },
    { label: "tracking", value: countText(stats.trackedCount) },
  ];
  if (timeline.lastDay) list.push({ label: "latest day", value: timeline.lastDay });
  if (stats.scoreCount >= STATS_MIN_SCORES && stats.trackScore !== null) {
    list.push({
      label: `${countText(stats.scoreCount)} ratings`,
      value: `${(stats.trackScore / 20).toFixed(1)}/5`,
      star: true,
    });
  }
  if (stats.trackedCount >= STATS_MIN_TRACKED) {
    list.push({ label: "favorites", value: `♥ ${countText(stats.favoriteCount)}` });
  }
  return list;
});
</script>

<template>
  <dl
    class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border-subtle sm:(grid-flow-col auto-cols-fr)"
  >
    <div
      v-for="cell in cells"
      :key="cell.label"
      class="flex flex-col-reverse gap-1.5 bg-bg-subtle px-4 py-3.5 last:odd:col-span-2 sm:last:odd:col-span-1"
    >
      <dt class="text-xs text-fg-subtle">{{ cell.label }}</dt>
      <dd class="text-xl font-medium text-fg tabular-nums whitespace-nowrap">
        <span v-if="cell.star" class="text-accent" aria-hidden="true">★ </span>{{ cell.value }}
      </dd>
    </div>
  </dl>
</template>
