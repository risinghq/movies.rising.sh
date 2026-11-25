<script setup lang="ts">
import { computed } from "vue";
import type { MediaTimelineDay } from "@/domain/tracking/media-timeline";
import { TIMELINE_DAYS, watchesText } from "@/shared/community";

const props = defineProps<{ days: MediaTimelineDay[] }>();

const RECENT_DAYS = 7;

const recent = computed(() =>
  props.days
    .filter((day) => day.watches > 0)
    .reverse()
    .slice(0, RECENT_DAYS),
);
</script>

<template>
  <section class="flex flex-col gap-3 min-w-0">
    <h3 class="text-[0.8125rem] font-medium text-fg-muted">by day</h3>
    <ul
      v-if="recent.length"
      class="overflow-hidden rounded-lg border border-border bg-bg-subtle text-[0.8125rem]"
    >
      <li
        v-for="day in recent"
        :key="day.date"
        class="-mt-px flex justify-between gap-3 border-t border-border-subtle px-3.5 py-2.5"
      >
        <time :datetime="day.date" class="text-fg tabular-nums">{{ day.date }}</time>
        <span class="text-fg-muted">{{ watchesText(day.watches) }}</span>
      </li>
    </ul>
    <p v-else class="text-[0.8125rem] text-fg-subtle">
      no watches in the last {{ TIMELINE_DAYS }} days
    </p>
  </section>
</template>
