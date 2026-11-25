<script setup lang="ts">
import { Link } from "@void/vue";
import { tmdbImage } from "@/shared/tmdb-image";

// The caption names the link, so the poster is decorative.
defineProps<{ title: string; slug: string; posterPath: string | null }>();
</script>

<template>
  <Link :href="`/media/${slug}`" class="group flex flex-col gap-1.5 rounded-lg focus-ring">
    <span class="block aspect-[2/3] overflow-hidden rounded-lg border border-border bg-bg-elevated">
      <img
        v-if="posterPath"
        :src="tmdbImage(posterPath, 'w185')"
        alt=""
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover"
      />
    </span>
    <span class="favorite-caption">{{ title }}</span>
  </Link>
</template>
