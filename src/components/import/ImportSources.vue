<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "@void/vue";
import Btn from "@/components/ui/Btn.vue";
import Input from "@/components/ui/Input.vue";
import ImportSourceCard from "@/components/import/ImportSourceCard.vue";
import { connectSource, importMessage, scanAnilist, scanExport } from "@/composables/useImportApi";
import type { ConnectedSource, FileSource } from "@/shared/import";

const CONNECTED: { id: ConnectedSource; name: string; brings: string; note?: string }[] = [
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

const FILES: {
  id: FileSource;
  name: string;
  brings: string;
  exportLink: string;
  thenChoose: string;
  href: string;
  accept: string;
  multiple: boolean;
}[] = [
  {
    id: "letterboxd",
    name: "Letterboxd",
    brings: "diary, ratings, watchlist and favorite films",
    exportLink: "export your data",
    thenChoose: "then choose the ZIP.",
    href: "https://letterboxd.com/settings/data/",
    accept: ".zip,.csv",
    multiple: false,
  },
  {
    id: "imdb",
    name: "IMDb",
    brings: "ratings and watchlist",
    exportLink: "export your ratings and watchlist",
    thenChoose: "then choose both CSVs.",
    href: "https://www.imdb.com/exports/",
    accept: ".csv,.zip",
    multiple: true,
  },
];

const router = useRouter();
const busy = ref<ConnectedSource | FileSource | "anilist" | null>(null);
const error = ref("");
const anilistName = ref("");

async function readAnilist() {
  busy.value = "anilist";
  error.value = "";
  const result = await scanAnilist(anilistName.value);
  if (!result.ok) {
    busy.value = null;
    error.value = importMessage(result.error);
    return;
  }
  void router.visit(`/import?id=${result.value.id}`);
}

async function connect(source: ConnectedSource) {
  busy.value = source;
  error.value = "";
  const result = await connectSource(source);
  if (!result.ok) {
    busy.value = null;
    error.value = importMessage(result.error);
    return;
  }
  window.location.assign(result.value);
}

async function upload(source: FileSource, event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = "";
  if (files.length === 0) return;
  busy.value = source;
  error.value = "";
  const result = await scanExport(source, files);
  if (!result.ok) {
    busy.value = null;
    error.value = importMessage(result.error);
    return;
  }
  void router.visit(`/import?id=${result.value.id}`);
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <h2 class="text-xs font-mono text-fg-subtle uppercase tracking-wider">bring your history</h2>
    <ul class="grid gap-3 sm:grid-cols-2">
      <ImportSourceCard
        v-for="source in CONNECTED"
        :key="source.id"
        :name="source.name"
        :brings="source.brings"
      >
        <template v-if="source.note" #note>{{ source.note }}</template>
        <Btn
          variant="primary"
          size="sm"
          classicon="i-lucide:plug"
          :disabled="busy !== null"
          @click="connect(source.id)"
        >
          {{ busy === source.id ? "opening..." : `connect ${source.name}` }}
        </Btn>
      </ImportSourceCard>
      <ImportSourceCard
        name="AniList"
        brings="anime you watched, are watching, plan to watch or dropped, scores and favorites"
      >
        <template #note>
          the list must be public. AniList keeps no episode dates, so episodes arrive undated.
        </template>
        <form class="flex flex-wrap items-center gap-2" @submit.prevent="readAnilist">
          <Input
            v-model="anilistName"
            size="sm"
            placeholder="AniList username"
            aria-label="AniList username"
            autocomplete="off"
            spellcheck="false"
            required
            :disabled="busy !== null"
          />
          <Btn
            type="submit"
            variant="primary"
            size="sm"
            classicon="i-lucide:list-video"
            :disabled="busy !== null"
          >
            {{ busy === "anilist" ? "reading list..." : "read list" }}
          </Btn>
        </form>
      </ImportSourceCard>
      <ImportSourceCard
        v-for="source in FILES"
        :key="source.id"
        :name="source.name"
        :brings="source.brings"
      >
        <template #note>
          <a
            :href="source.href"
            target="_blank"
            rel="noopener"
            class="text-accent hover:underline"
            >{{ source.exportLink }}</a
          >, {{ source.thenChoose }}
        </template>
        <label
          class="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-mono border border-border text-fg cursor-pointer hover:bg-bg focus-within:outline focus-within:outline-2 focus-within:outline-accent"
          :class="{ 'pointer-events-none opacity-50': busy !== null }"
        >
          <span
            :class="
              busy === source.id
                ? 'i-lucide:loader-circle motion-safe:animate-spin'
                : 'i-lucide:file-up'
            "
            class="w-4 h-4"
            aria-hidden="true"
          />
          {{ busy === source.id ? "matching titles..." : `choose ${source.name} export` }}
          <input
            type="file"
            class="sr-only"
            :accept="source.accept"
            :multiple="source.multiple"
            :disabled="busy !== null"
            @change="upload(source.id, $event)"
          />
        </label>
      </ImportSourceCard>
    </ul>
    <p v-if="busy === 'letterboxd' || busy === 'imdb'" role="status" class="text-xs text-fg-subtle">
      matching each title to TMDB. a few thousand titles take under a minute.
    </p>
    <p v-if="error" role="alert" class="text-xs text-red-400 font-mono">{{ error }}</p>
    <p class="text-xs text-fg-subtle">
      connected sources ask you to approve read access on their own site, and the access is revoked
      as soon as the scan ends. AniList needs no access: its public list is read by name. export
      files are read in your browser; only the titles, dates and ratings are sent. nothing is
      written to your library until you review it.
    </p>
  </section>
</template>
