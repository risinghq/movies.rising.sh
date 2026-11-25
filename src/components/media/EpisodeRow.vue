<script setup lang="ts">
import { computed } from "vue";
import type { EpisodeRecord } from "@/domain/catalog/episodes";

const props = defineProps<{
  episode: EpisodeRecord;
  watched: boolean;
  canLog: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{ log: []; unlog: [] }>();

const meta = computed(() =>
  [props.episode.airDate, props.episode.runtime ? `${props.episode.runtime} min` : null]
    .filter(Boolean)
    .join(" · "),
);
</script>

<template>
  <li
    class="-mt-px grid grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 sm:gap-3 border-t border-border-subtle py-1.5 pr-2 pl-3.5 sm:(py-2.5 px-4)"
  >
    <span class="text-right text-xs text-fg-subtle tabular-nums">{{ episode.episodeNumber }}</span>

    <div class="min-w-0">
      <p class="truncate text-fg">{{ episode.name ?? `episode ${episode.episodeNumber}` }}</p>
      <p v-if="meta" class="mt-0.5 text-xs text-fg-subtle">{{ meta }}</p>
    </div>

    <span class="flex justify-end sm:min-w-22">
      <button
        v-if="watched && canLog"
        type="button"
        class="group min-w-11 h-11 sm:(h-7 min-w-0) rounded-md border border-transparent px-2 sm:px-2.5 text-xs text-green-500 transition-colors sm:hover:(border-border-hover text-red-400) disabled:opacity-60 focus-ring"
        :disabled="saving"
        :aria-label="`un-watch episode ${episode.episodeNumber}`"
        @click="emit('unlog')"
      >
        <span class="sm:group-hover:hidden">watched</span>
        <span class="hidden sm:group-hover:inline">un-watch</span>
      </button>
      <span v-else-if="watched" class="px-2 sm:px-2.5 text-xs text-green-500">watched</span>
      <button
        v-else-if="canLog"
        type="button"
        class="min-w-11 h-11 sm:(h-7 min-w-0) rounded-md border border-border bg-bg px-2.5 text-xs text-fg-muted transition-colors hover:(border-border-hover text-fg) disabled:opacity-60 focus-ring"
        :disabled="saving"
        :aria-label="`log episode ${episode.episodeNumber}`"
        @click="emit('log')"
      >
        + log
      </button>
    </span>
  </li>
</template>
