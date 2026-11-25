<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { Props } from "./search.server";
import { useMediaSearch, type LocalResult, type RemoteResult } from "@/composables/useMediaSearch";
import SearchTitles, { type SearchItem } from "@/components/media/SearchTitles.vue";
import SearchPeople from "@/components/SearchPeople.vue";
import LayoutToggle from "@/components/ui/LayoutToggle.vue";
import { useLayoutPreference } from "@/composables/useLayoutPreference";
import { useUrlState } from "@/composables/useUrlState";

const props = defineProps<Props>();

const search = useMediaSearch({ limit: 40 });
search.query.value = props.query;
search.local.value = props.results.local;
search.remote.value = props.results.remote;
search.people.value = props.results.people;
search.remoteEnabled.value = props.results.remoteEnabled;
if (props.query) search.hasSearched.value = true;

const inputRef = ref<HTMLInputElement | null>(null);
const queryInput = ref(props.query);
const { layout } = useLayoutPreference();
const typeFilter = ref("all");
const sortKey = ref("relevance");
useUrlState({ q: queryInput, type: typeFilter, sort: sortKey }, { type: "all", sort: "relevance" });

const sortOptions = [
  { value: "relevance", label: "relevance" },
  { value: "year", label: "year" },
  { value: "rating", label: "rating" },
  { value: "title", label: "title" },
] as const;
const typeOptions = [
  { value: "all", label: "all" },
  { value: "movie", label: "movies" },
  { value: "show", label: "shows" },
  { value: "person", label: "people" },
] as const;

// "all" previews the top people above the titles; "people" lists every one.
const PEOPLE_PREVIEW = 4;
const peopleOnly = computed(() => typeFilter.value === "person");
const people = computed(() => {
  if (peopleOnly.value) return search.people.value;
  if (typeFilter.value !== "all") return [];
  return search.people.value.slice(0, PEOPLE_PREVIEW);
});
const peopleTotal = computed(() =>
  typeFilter.value === "all" ? search.people.value.length : undefined,
);

function fromLocal(r: LocalResult): SearchItem {
  return {
    key: `l:${r.id}`,
    title: r.title,
    mediaType: r.mediaType,
    posterPath: r.posterPath ?? null,
    releaseDate: r.releaseDate ?? null,
    voteAverage: r.voteAverage ?? null,
    slug: r.slug ?? null,
    media: r.id,
    tracked: r.inLibrary,
  };
}

function fromRemote(r: RemoteResult): SearchItem {
  return {
    key: `r:${r.mediaType}:${r.tmdbId}`,
    title: r.title,
    mediaType: r.mediaType,
    posterPath: r.posterPath,
    releaseDate: r.releaseDate,
    voteAverage: r.voteAverage,
    slug: r.slug,
    media: r,
    tracked: r.inLibrary,
  };
}

const items = computed<SearchItem[]>(() => {
  if (peopleOnly.value) return [];
  const locals = search.local.value.map(fromLocal);
  const localIds = new Set(
    locals.map((i) => (typeof i.media === "string" ? i.media : "")).filter(Boolean),
  );
  // Drop a remote candidate already shown as a local catalog row (no double row).
  const remotes = search.remote.value
    .filter((r) => !(r.cachedMediaId && localIds.has(r.cachedMediaId)))
    .map(fromRemote);

  let all = [...locals, ...remotes];
  if (typeFilter.value !== "all") all = all.filter((i) => i.mediaType === typeFilter.value);

  const sorted = [...all];
  if (sortKey.value === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
  else if (sortKey.value === "year")
    sorted.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  else if (sortKey.value === "rating")
    sorted.sort((a, b) => (b.voteAverage ?? -1) - (a.voteAverage ?? -1));
  // Relevance preserves server order: local catalog hits first, then TMDB rank.
  return sorted;
});

const trimmed = computed(() => queryInput.value.trim());
const resultCount = computed(
  () =>
    items.value.length +
    (peopleOnly.value || typeFilter.value === "all" ? search.people.value.length : 0),
);
const hasResults = computed(() => items.value.length > 0 || people.value.length > 0);

let debounce: ReturnType<typeof setTimeout> | undefined;
watch(queryInput, (q) => {
  search.query.value = q;
  clearTimeout(debounce);
  if (!q.trim()) {
    search.clear();
    return;
  }
  debounce = setTimeout(() => void search.run(), 250);
});

onMounted(() => {
  if (!props.query) inputRef.value?.focus();
});
</script>

<template>
  <main class="container flex flex-col gap-8 py-8 sm:py-12">
    <div class="flex flex-col gap-1">
      <h1 class="text-3xl font-mono font-bold">search</h1>
      <p class="text-fg-muted text-sm">find a movie, show or person. track titles inline.</p>
    </div>

    <div
      class="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3 focus-within:border-border-hover transition-colors"
    >
      <span class="i-lucide:search w-5 h-5 shrink-0 text-fg-subtle" aria-hidden="true" />
      <input
        ref="inputRef"
        v-model="queryInput"
        type="text"
        placeholder="search titles and people..."
        class="w-full bg-transparent text-fg placeholder:text-fg-subtle text-base outline-none font-mono"
        aria-label="search titles and people"
      />
      <span
        v-if="search.loading.value"
        class="i-lucide:loader-circle w-4 h-4 shrink-0 text-fg-subtle animate-spin"
        aria-hidden="true"
      />
    </div>

    <template v-if="trimmed">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-sm font-mono text-fg-muted" aria-live="polite">
          results
          <span class="text-fg-subtle ml-1">({{ resultCount }})</span>
        </h2>

        <div class="flex flex-wrap items-center gap-2">
          <div class="flex gap-1">
            <button
              v-for="opt in typeOptions"
              :key="opt.value"
              type="button"
              class="px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors focus-ring"
              :class="
                typeFilter === opt.value
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg'
              "
              @click="typeFilter = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>

          <div
            v-if="!peopleOnly"
            class="flex rounded-lg border border-border overflow-hidden"
            role="group"
            aria-label="sort by"
          >
            <button
              v-for="opt in sortOptions"
              :key="opt.value"
              type="button"
              class="px-2.5 py-1 text-xs font-mono transition-colors focus-ring"
              :class="
                sortKey === opt.value
                  ? 'bg-bg-elevated text-fg'
                  : 'bg-bg-subtle text-fg-muted hover:bg-bg-elevated hover:text-fg'
              "
              @click="sortKey = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>

          <LayoutToggle v-if="!peopleOnly" v-model="layout" />
        </div>
      </div>

      <p v-if="search.error.value" class="text-sm text-red-400 font-mono">
        {{ search.error.value }}
      </p>

      <div
        v-if="!hasResults && search.loading.value"
        class="py-14 text-center font-mono text-sm text-fg-muted"
      >
        searching...
      </div>

      <div v-else-if="!hasResults" class="flex flex-col items-center gap-3 py-14 text-center">
        <span class="i-lucide:search-x w-10 h-10 text-fg-subtle" aria-hidden="true" />
        <p class="font-mono text-fg-muted text-sm">nothing matches "{{ trimmed }}"</p>
      </div>

      <SearchPeople
        v-if="people.length"
        :people="people"
        :total="peopleTotal"
        @show-all="typeFilter = 'person'"
      />

      <SearchTitles
        v-if="items.length"
        :items="items"
        :layout="layout"
        :heading="people.length > 0"
      />
    </template>

    <div v-else class="flex flex-col items-center gap-3 py-16 text-center">
      <span class="i-lucide:clapperboard w-10 h-10 text-fg-subtle" aria-hidden="true" />
      <p class="font-mono text-fg-muted text-sm">start typing to search the catalog</p>
      <p v-if="!search.remoteEnabled.value" class="text-xs text-fg-subtle">
        searching your local catalog only
      </p>
    </div>
  </main>
</template>
