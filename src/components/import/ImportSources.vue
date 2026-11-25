<script setup lang="ts">
import { ref } from "vue";
import Btn from "@/components/ui/Btn.vue";
import { connectSource, importMessage } from "@/composables/useImportApi";
import type { ImportSource } from "@/shared/import";

const SOURCES: { id: ImportSource; name: string; brings: string; note?: string }[] = [
  {
    id: "trakt",
    name: "Trakt",
    brings: "watch history, ratings, watchlist, favorites and dropped shows",
  },
  {
    id: "tmdb",
    name: "TMDB",
    brings: "ratings, watchlist and favorites",
    note: "TMDB keeps no watch history, so rated titles arrive without play dates.",
  },
];

const connecting = ref<ImportSource | null>(null);
const error = ref("");

async function connect(source: ImportSource) {
  connecting.value = source;
  error.value = "";
  const result = await connectSource(source);
  if (!result.ok) {
    connecting.value = null;
    error.value = importMessage(result.error);
    return;
  }
  window.location.assign(result.value);
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <h2 class="text-xs font-mono text-fg-subtle uppercase tracking-wider">bring your history</h2>
    <ul class="grid gap-3 sm:grid-cols-2">
      <li
        v-for="source in SOURCES"
        :key="source.id"
        class="flex flex-col gap-3 rounded-xl border border-border bg-bg-subtle p-4"
      >
        <div class="flex flex-col gap-1">
          <span class="font-mono text-fg">{{ source.name }}</span>
          <p class="text-sm text-fg-muted">{{ source.brings }}</p>
          <p v-if="source.note" class="text-xs text-fg-subtle">{{ source.note }}</p>
        </div>
        <Btn
          class="self-start mt-auto"
          variant="primary"
          size="sm"
          classicon="i-lucide:plug"
          :disabled="connecting !== null"
          @click="connect(source.id)"
        >
          {{ connecting === source.id ? "opening..." : `connect ${source.name}` }}
        </Btn>
      </li>
    </ul>
    <p v-if="error" role="alert" class="text-xs text-red-400 font-mono">{{ error }}</p>
    <p class="text-xs text-fg-subtle">
      you approve read access on the source's own site. nothing is written to your library until you
      review it, and the access is revoked as soon as the scan ends.
    </p>
  </section>
</template>
