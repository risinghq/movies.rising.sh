<script lang="ts">
import type { MediaRef } from "@/shared/tracking";

/** A search title, from the catalog or from TMDB. */
export type SearchItem = {
  key: string;
  title: string;
  mediaType: "movie" | "show";
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  slug: string | null;
  media: MediaRef;
  tracked: boolean;
};
</script>

<script setup lang="ts">
import SearchResultCard from "./SearchResultCard.vue";
import MediaResultRow from "./MediaResultRow.vue";
import MediaCollection from "./MediaCollection.vue";
import type { MediaLayout } from "@/composables/useLayoutPreference";

defineProps<{ items: SearchItem[]; layout: MediaLayout; heading?: boolean }>();
</script>

<template>
  <section class="flex flex-col gap-3" aria-label="titles">
    <h3 v-if="heading" class="text-xs font-mono text-fg-subtle">titles</h3>
    <MediaCollection :layout="layout">
      <template v-if="layout === 'grid'">
        <SearchResultCard
          v-for="item in items"
          :key="item.key"
          :title="item.title"
          :media-type="item.mediaType"
          :poster-path="item.posterPath"
          :release-date="item.releaseDate"
          :vote-average="item.voteAverage"
          :slug="item.slug"
          :media="item.media"
          :tracked="item.tracked"
        />
      </template>
      <template v-else>
        <MediaResultRow
          v-for="item in items"
          :key="item.key"
          :title="item.title"
          :media-type="item.mediaType"
          :poster-path="item.posterPath"
          :release-date="item.releaseDate"
          :slug="item.slug"
          :media="item.media"
          :tracked="item.tracked"
        />
      </template>
    </MediaCollection>
  </section>
</template>
