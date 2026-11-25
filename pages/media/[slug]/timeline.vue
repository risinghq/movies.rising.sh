<script setup lang="ts">
import { computed } from "vue";
import type { Props } from "./timeline.server";
import CommunityStats from "@/components/community/CommunityStats.vue";
import RecentDays from "@/components/community/RecentDays.vue";
import StatusBreakdown from "@/components/community/StatusBreakdown.vue";
import WatchChart from "@/components/community/WatchChart.vue";
import MediaHeader from "@/components/media/MediaHeader.vue";
import { STATS_MIN_TRACKED } from "@/shared/community";

const props = defineProps<Props>();

const hasActivity = computed(() => props.timeline.viewers > 0 || props.stats.trackedCount > 0);
</script>

<template>
  <main class="flex-1">
    <MediaHeader :media="media" page="timeline" />

    <div class="container w-full flex flex-col gap-6 pt-4 pb-10 font-mono sm:(gap-7 pt-6 pb-16)">
      <header class="flex flex-col gap-1">
        <h2 class="text-[0.9375rem] font-medium text-fg">community activity</h2>
        <p class="text-[0.8125rem] text-fg-subtle">who is watching {{ media.title }}</p>
      </header>

      <div
        v-if="!hasActivity"
        class="rounded-lg border border-dashed border-border px-4 py-6 text-[0.8125rem]"
      >
        <p class="text-fg-muted">no community activity yet</p>
        <p class="mt-1 text-fg-subtle">
          stats show once {{ STATS_MIN_TRACKED }} people track this title
        </p>
      </div>

      <template v-else>
        <CommunityStats :timeline="timeline" :stats="stats" />
        <StatusBreakdown :stats="stats" />
        <div class="grid gap-6 lg:(grid-cols-[minmax(0,1fr)_340px] gap-x-14)">
          <WatchChart :timeline="timeline" />
          <RecentDays :days="timeline.days" />
        </div>
      </template>
    </div>
  </main>
</template>
