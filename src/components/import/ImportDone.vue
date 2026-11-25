<script setup lang="ts">
import { computed } from "vue";
import { Link } from "@void/vue";
import ImportUndo from "./ImportUndo.vue";
import type { ImportReport } from "@/shared/import";
import { formatCount } from "./format";

const props = defineProps<{ id: string; sourceName: string; report: ImportReport }>();

const lines = computed(() => {
  const r = props.report;
  const out: string[] = [];
  if (r.entriesCreated) out.push(`${formatCount(r.entriesCreated, "title", "titles")} added`);
  if (r.entriesUpdated) out.push(`${formatCount(r.entriesUpdated, "title", "titles")} updated`);
  if (r.plays) out.push(formatCount(r.plays, "play", "plays"));
  if (r.scores) out.push(formatCount(r.scores, "score", "scores"));
  if (r.favorites) out.push(formatCount(r.favorites, "favorite", "favorites"));
  return out;
});

const notes = computed(() => {
  const r = props.report;
  const out: string[] = [];
  if (r.undatedPlays) out.push(`${formatCount(r.undatedPlays, "play has", "plays have")} no date.`);
  if (r.duplicatePlays)
    out.push(`${formatCount(r.duplicatePlays, "play was", "plays were")} already here.`);
  if (r.scoresKept)
    out.push(`${formatCount(r.scoresKept, "score", "scores")} you set here stayed as they were.`);
  if (r.missingTitles)
    out.push(`${formatCount(r.missingTitles, "title", "titles")} could not be found on TMDB.`);
  return out;
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <section class="flex flex-col gap-2">
      <p class="font-mono text-fg">imported from {{ props.sourceName }}</p>
      <p class="text-sm text-fg-muted">{{ lines.join(" · ") }}</p>
      <p v-for="note in notes" :key="note" class="text-xs text-fg-subtle">{{ note }}</p>
    </section>
    <div class="flex flex-wrap items-center gap-3">
      <Link
        href="/"
        class="inline-flex items-center gap-x-1 font-mono text-sm px-4 py-2 rounded-md border border-border text-bg bg-fg hover:bg-fg/50 transition-all duration-200"
      >
        <span class="i-lucide:library w-4 h-4" aria-hidden="true" />
        open your library
      </Link>
    </div>
    <ImportUndo :id="props.id" />
  </div>
</template>
