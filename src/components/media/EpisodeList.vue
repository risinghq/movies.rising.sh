<script setup lang="ts">
import { computed, ref } from "vue";
import type { EpisodeRecord, SeasonSummary } from "@/domain/catalog/episodes";
import EpisodeRow from "./EpisodeRow.vue";

const props = defineProps<{
  seasons: SeasonSummary[];
  /** Loaded episodes by season number. A season missing here is not loaded. */
  episodes: Map<number, EpisodeRecord[]>;
  loadSeason: (seasonNumber: number) => Promise<void>;
  watchedKeys: string[];
  canLog: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{
  log: [seasonNumber: number, episodeNumber: number];
  unlog: [seasonNumber: number, episodeNumber: number];
}>();

const watched = computed(() => new Set(props.watchedKeys));

const watchedBySeason = computed(() => {
  const counts = new Map<number, number>();
  for (const k of props.watchedKeys) {
    const seasonNumber = Number(k.slice(0, k.indexOf(":")));
    counts.set(seasonNumber, (counts.get(seasonNumber) ?? 0) + 1);
  }
  return counts;
});

const openSeasons = ref(new Set<number>(props.seasons.slice(0, 1).map((s) => s.seasonNumber)));
const failedSeasons = ref(new Set<number>());

async function toggleSeason(seasonNumber: number) {
  const next = new Set(openSeasons.value);
  if (next.has(seasonNumber)) next.delete(seasonNumber);
  else next.add(seasonNumber);
  openSeasons.value = next;
  if (next.has(seasonNumber) && !props.episodes.has(seasonNumber)) await load(seasonNumber);
}

async function load(seasonNumber: number) {
  const failed = new Set(failedSeasons.value);
  failed.delete(seasonNumber);
  try {
    await props.loadSeason(seasonNumber);
  } catch {
    failed.add(seasonNumber);
  }
  failedSeasons.value = failed;
}

function key(seasonNumber: number, episodeNumber: number) {
  return `${seasonNumber}:${episodeNumber}`;
}

function isWatched(seasonNumber: number, episodeNumber: number) {
  return watched.value.has(key(seasonNumber, episodeNumber));
}
</script>

<template>
  <div
    v-if="seasons.length === 0"
    class="rounded-lg border border-dashed border-border px-4 py-6 text-sm font-mono text-fg-subtle"
  >
    episodes are still loading, check back in a moment
  </div>

  <div v-else class="flex flex-col gap-3">
    <div
      v-for="season in seasons"
      :key="season.seasonNumber"
      class="rounded-lg border border-border bg-bg-subtle"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-ring"
        @click="toggleSeason(season.seasonNumber)"
      >
        <span class="text-sm font-mono text-fg lowercase">
          {{ season.seasonNumber === 0 ? "specials" : `season ${season.seasonNumber}` }}
        </span>
        <span class="flex items-center gap-3 text-[0.7rem] font-mono text-fg-subtle">
          {{ watchedBySeason.get(season.seasonNumber) ?? 0 }} / {{ season.episodeCount }} watched
          <span
            class="h-3.5 w-3.5 transition-transform"
            :class="[
              openSeasons.has(season.seasonNumber)
                ? 'i-lucide:chevron-down'
                : 'i-lucide:chevron-right',
            ]"
            aria-hidden="true"
          />
        </span>
      </button>

      <template v-if="openSeasons.has(season.seasonNumber)">
        <p
          v-if="failedSeasons.has(season.seasonNumber)"
          class="border-t border-border px-4 py-3 text-[0.7rem] font-mono text-fg-subtle"
        >
          episodes failed to load.
          <button
            type="button"
            class="underline hover:text-fg focus-ring"
            @click="load(season.seasonNumber)"
          >
            try again
          </button>
        </p>
        <p
          v-else-if="!episodes.has(season.seasonNumber)"
          class="border-t border-border px-4 py-3 text-[0.7rem] font-mono text-fg-subtle"
          aria-live="polite"
        >
          loading episodes
        </p>
      </template>
      <ul
        v-if="openSeasons.has(season.seasonNumber) && episodes.has(season.seasonNumber)"
        class="flex flex-col divide-y divide-border border-t border-border"
      >
        <EpisodeRow
          v-for="ep in episodes.get(season.seasonNumber)"
          :key="ep.episodeNumber"
          :episode="ep"
          :watched="isWatched(season.seasonNumber, ep.episodeNumber)"
          :can-log="canLog"
          :saving="saving"
          @log="emit('log', season.seasonNumber, ep.episodeNumber)"
          @unlog="emit('unlog', season.seasonNumber, ep.episodeNumber)"
        />
      </ul>
    </div>
  </div>
</template>
