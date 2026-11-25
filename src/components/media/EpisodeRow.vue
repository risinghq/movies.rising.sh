<script setup lang="ts">
import type { EpisodeRecord } from "@/domain/catalog/episodes";

defineProps<{
  episode: EpisodeRecord;
  watched: boolean;
  canLog: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{ log: []; unlog: [] }>();
</script>

<template>
  <li class="flex items-center gap-3 px-4 py-2.5">
    <span class="w-8 shrink-0 text-right text-[0.7rem] font-mono text-fg-subtle">
      {{ episode.episodeNumber }}
    </span>

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-mono text-fg">
        {{ episode.name ?? `episode ${episode.episodeNumber}` }}
      </p>
      <p v-if="episode.airDate || episode.runtime" class="text-[0.65rem] font-mono text-fg-subtle">
        <span v-if="episode.airDate">{{ episode.airDate }}</span>
        <span v-if="episode.airDate && episode.runtime" aria-hidden="true"> · </span>
        <span v-if="episode.runtime">{{ episode.runtime }} min</span>
      </p>
    </div>

    <button
      v-if="watched && canLog"
      type="button"
      class="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.7rem] font-mono text-green-500 transition-colors hover:text-fg-muted disabled:opacity-60 focus-ring"
      :disabled="saving"
      title="un-watch this episode"
      @click="emit('unlog')"
    >
      <span class="i-lucide:check w-3.5 h-3.5 group-hover:hidden" aria-hidden="true" />
      <span class="i-lucide:x w-3.5 h-3.5 hidden group-hover:inline" aria-hidden="true" />
      <span class="group-hover:hidden">watched</span>
      <span class="hidden group-hover:inline">un-watch</span>
    </button>
    <span
      v-else-if="watched"
      class="inline-flex items-center gap-1.5 px-2 py-1 text-[0.7rem] font-mono text-green-500"
    >
      <span class="i-lucide:check w-3.5 h-3.5" aria-hidden="true" />
      watched
    </span>
    <button
      v-else-if="canLog"
      type="button"
      class="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[0.7rem] font-mono text-fg-muted transition-colors hover:border-accent/40 hover:text-fg disabled:opacity-60 focus-ring"
      :disabled="saving"
      @click="emit('log')"
    >
      <span class="i-lucide:plus w-3 h-3" aria-hidden="true" />
      log
    </button>
  </li>
</template>
