<script setup lang="ts">
import { computed } from "vue";
import type { MediaTimelineView } from "@/domain/tracking/media-timeline";
import { TIMELINE_DAYS, watchesText } from "@/shared/community";

const props = defineProps<{ timeline: MediaTimelineView }>();

const peak = computed(() => Math.max(...props.timeline.days.map((day) => day.watches), 1));
const firstDay = computed(() => props.timeline.days[0]?.date.slice(5));
const lastDay = computed(() => props.timeline.days.at(-1)?.date.slice(5));
</script>

<template>
  <section class="flex flex-col gap-3 min-w-0">
    <h3 class="flex items-baseline gap-2 text-[0.8125rem] font-medium text-fg-muted">
      watches
      <span class="text-xs font-normal text-fg-subtle">last {{ TIMELINE_DAYS }} days</span>
    </h3>
    <div
      class="flex h-24 items-end gap-0.5 rounded-lg border border-border bg-bg-subtle p-3 sm:gap-1"
      role="img"
      :aria-label="`${watchesText(timeline.windowWatches)} in the last ${TIMELINE_DAYS} days`"
    >
      <div
        v-for="day in timeline.days"
        :key="day.date"
        class="min-h-0.5 flex-1 rounded-t-sm bg-accent"
        :style="{ height: `${(day.watches / peak) * 100}%` }"
        :title="`${day.date} · ${watchesText(day.watches)}`"
      />
    </div>
    <div class="flex justify-between text-[0.6875rem] text-fg-subtle tabular-nums">
      <span>{{ firstDay }}</span>
      <span>{{ lastDay }}</span>
    </div>
  </section>
</template>
