<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { EpisodeRecord, SeasonSummary } from "@/domain/catalog/episodes";
import { episodeKey, openingSeason, seasonName, watchedBySeason } from "@/shared/tracking";
import EpisodeRow from "./EpisodeRow.vue";
import SeasonPicker from "./SeasonPicker.vue";

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
const watchedCounts = computed(() => watchedBySeason(props.watchedKeys));

// Matches the season the server loaded, so the first paint needs no fetch.
const picked = ref(openingSeason(props.seasons, props.watchedKeys));
const failed = ref(false);

const season = computed(() => props.seasons.find((s) => s.seasonNumber === picked.value) ?? null);
const rows = computed(() => (picked.value === null ? undefined : props.episodes.get(picked.value)));
const countText = computed(() => {
  if (!season.value) return "";
  if (!props.canLog) return `${season.value.episodeCount} episodes`;
  const seen = watchedCounts.value.get(season.value.seasonNumber) ?? 0;
  return `${seen} / ${season.value.episodeCount} watched`;
});

async function load(seasonNumber: number) {
  failed.value = false;
  try {
    await props.loadSeason(seasonNumber);
  } catch {
    if (picked.value === seasonNumber) failed.value = true;
  }
}

function ensureLoaded() {
  if (picked.value !== null && !props.episodes.has(picked.value)) void load(picked.value);
}

function pick(seasonNumber: number) {
  picked.value = seasonNumber;
  failed.value = false;
  ensureLoaded();
}

// Seasons arrive late when episodes hydrate after the first paint.
watch(
  () => props.seasons,
  (seasons) => {
    if (seasons.some((s) => s.seasonNumber === picked.value)) return;
    picked.value = openingSeason(seasons, props.watchedKeys);
    ensureLoaded();
  },
);

onMounted(ensureLoaded);
</script>

<template>
  <div
    v-if="seasons.length === 0"
    class="rounded-lg border border-dashed border-border px-4 py-6 text-[0.8125rem] font-mono text-fg-subtle"
  >
    episodes are still loading, check back in a moment
  </div>

  <div v-else class="flex flex-col gap-3 font-mono">
    <div class="flex items-center gap-2.5 sm:gap-4">
      <SeasonPicker :seasons="seasons" :picked="picked" @pick="pick" />
      <span class="flex-none text-xs text-fg-subtle tabular-nums">{{ countText }}</span>
    </div>

    <div
      id="season-episodes"
      role="tabpanel"
      :aria-label="picked === null ? undefined : seasonName(picked)"
      class="overflow-hidden rounded-lg border border-border bg-bg-subtle text-sm"
    >
      <p v-if="failed" class="px-3.5 sm:px-4 py-3.5 text-[0.8125rem] text-fg-muted">
        episodes failed to load.
        <button
          type="button"
          class="text-accent underline underline-offset-3 focus-ring"
          @click="picked !== null && load(picked)"
        >
          try again
        </button>
      </p>
      <p
        v-else-if="!rows"
        class="px-3.5 sm:px-4 py-3.5 text-[0.8125rem] text-fg-subtle"
        aria-live="polite"
      >
        loading episodes…
      </p>
      <ul v-else>
        <EpisodeRow
          v-for="ep in rows"
          :key="ep.episodeNumber"
          :episode="ep"
          :watched="watched.has(episodeKey(ep.seasonNumber, ep.episodeNumber))"
          :can-log="canLog"
          :saving="saving"
          @log="emit('log', ep.seasonNumber, ep.episodeNumber)"
          @unlog="emit('unlog', ep.seasonNumber, ep.episodeNumber)"
        />
      </ul>
    </div>
  </div>
</template>
