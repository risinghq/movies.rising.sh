<script setup lang="ts">
import { computed } from "vue";
import type { MediaStats } from "@/domain/insights/title-stats";
import { STATS_MIN_TRACKED } from "@/shared/community";
import { LIBRARY_STATUSES, statusBg } from "@/shared/library-status";

const props = defineProps<{ stats: MediaStats }>();

const statuses = computed(() =>
  props.stats.trackedCount < STATS_MIN_TRACKED
    ? []
    : LIBRARY_STATUSES.map((status) => ({
        status,
        count: props.stats.statusCounts[status],
      })).filter((s) => s.count > 0),
);
</script>

<template>
  <section class="flex flex-col gap-3">
    <h3 class="text-[0.8125rem] font-medium text-fg-muted">status</h3>
    <p v-if="statuses.length === 0" class="text-[0.8125rem] text-fg-subtle">
      stats show once {{ STATS_MIN_TRACKED }} people track this title
    </p>
    <template v-else>
      <div class="flex h-2 gap-0.5 overflow-hidden rounded">
        <div
          v-for="s in statuses"
          :key="s.status"
          :class="statusBg(s.status)"
          :style="{ flexGrow: s.count }"
          :title="`${s.status} ${s.count}`"
        />
      </div>
      <ul class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-muted">
        <li v-for="s in statuses" :key="s.status" class="flex items-center gap-1.5">
          <span class="size-2 rounded-sm" :class="statusBg(s.status)" aria-hidden="true" />
          {{ s.status }} <span class="text-fg tabular-nums">{{ s.count }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>
