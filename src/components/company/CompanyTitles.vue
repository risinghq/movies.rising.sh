<script setup lang="ts">
import { ref } from "vue";
import MediaCollection from "@/components/media/MediaCollection.vue";
import SearchResultCard from "@/components/media/SearchResultCard.vue";
import type { CompanyTitle } from "@/services/company-titles";
import type { CompanyFilter } from "@/shared/company";

const props = defineProps<{
  slug: string;
  filter: CompanyFilter;
  initial: CompanyTitle[];
  initialHasMore: boolean;
}>();

const titles = ref<CompanyTitle[]>(props.initial);
const hasMore = ref(props.initialHasMore);
const page = ref(1);
const loading = ref(false);
const loadFailed = ref(false);

const key = (t: CompanyTitle) => `${t.mediaType}:${t.tmdbId}`;

async function fetchPage(next: number) {
  const query = new URLSearchParams({
    company: props.slug,
    type: props.filter,
    page: String(next),
  });
  const res = await fetch(`/api/companies/titles?${query}`);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as { titles: CompanyTitle[]; hasMore: boolean };
}

async function loadMore() {
  loading.value = true;
  loadFailed.value = false;
  try {
    const next = await fetchPage(page.value + 1);
    const seen = new Set(titles.value.map(key));
    titles.value = [...titles.value, ...next.titles.filter((t) => !seen.has(key(t)))];
    hasMore.value = next.hasMore;
    page.value += 1;
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

function buttonText() {
  if (loading.value) return "loading more…";
  return loadFailed.value ? "try again" : "load more";
}
</script>

<template>
  <MediaCollection layout="grid">
    <SearchResultCard
      v-for="t in titles"
      :key="key(t)"
      :title="t.title"
      :media-type="t.mediaType"
      :poster-path="t.posterPath"
      :release-date="t.releaseDate"
      :vote-average="t.voteAverage"
      :slug="t.slug"
      :media="t"
      :tracked="t.inLibrary"
    />
  </MediaCollection>

  <div class="flex flex-col items-center gap-2 pt-2">
    <button
      v-if="hasMore || loadFailed"
      type="button"
      class="h-11 w-full rounded-md border border-border bg-bg-subtle px-6 text-sm text-fg transition-colors hover:(border-border-hover bg-bg-muted) disabled:(border-border-subtle bg-transparent text-fg-subtle) focus-ring sm:(h-10 w-auto)"
      :disabled="loading"
      @click="loadMore"
    >
      {{ buttonText() }}
    </button>
    <p v-if="loadFailed" class="text-xs text-fg-subtle" aria-live="polite">couldn't reach TMDB</p>
    <p v-else-if="page > 1 && !hasMore" class="text-xs text-fg-subtle">that's every title</p>
  </div>
</template>
