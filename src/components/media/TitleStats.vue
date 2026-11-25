<script setup lang="ts">
import { computed } from "vue";
import {
  STATS_MIN_SCORES,
  STATS_MIN_TRACKED,
  type MediaStats,
} from "@/domain/insights/title-stats";
import { LIBRARY_STATUSES, statusBg } from "@/shared/library-status";

const props = defineProps<{ stats: MediaStats }>();

const visible = computed(() => props.stats.trackedCount >= STATS_MIN_TRACKED);
const showTrackScore = computed(
  () => props.stats.scoreCount >= STATS_MIN_SCORES && props.stats.trackScore !== null,
);
const trackScore5 = computed(() =>
  props.stats.trackScore !== null ? (props.stats.trackScore / 20).toFixed(1) : null,
);
const statusBar = computed(() => {
  const total = props.stats.trackedCount || 1;
  return LIBRARY_STATUSES.map((status) => ({
    status,
    count: props.stats.statusCounts[status],
    pct: (props.stats.statusCounts[status] / total) * 100,
  })).filter((seg) => seg.count > 0);
});
</script>

<template>
  <section v-if="visible" class="flex flex-col gap-4">
    <h2 class="text-sm font-mono text-fg-muted">on track</h2>
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-4 text-sm font-mono">
        <span v-if="showTrackScore" class="text-fg">
          ★ {{ trackScore5 }}/5
          <span class="text-fg-subtle">({{ stats.scoreCount }})</span>
        </span>
        <span v-if="stats.favoriteCount > 0" class="text-fg-muted"
          >♥ {{ stats.favoriteCount }}</span
        >
        <span class="ml-auto text-fg-subtle">{{ stats.trackedCount }} tracking</span>
      </div>
      <div class="flex h-2 rounded-full overflow-hidden bg-bg-elevated">
        <div
          v-for="seg in statusBar"
          :key="seg.status"
          class="h-full"
          :class="statusBg(seg.status)"
          :style="{ width: `${seg.pct}%` }"
          :title="`${seg.status}: ${seg.count}`"
        />
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-fg-subtle">
        <span v-for="seg in statusBar" :key="seg.status" class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" :class="statusBg(seg.status)" />
          {{ seg.status }} {{ seg.count }}
        </span>
      </div>
    </div>
  </section>
</template>
