<script setup lang="ts">
import { Link } from "@void/vue";
import { tmdbImage } from "@/shared/tmdb-image";
import { initials } from "./favorites";

// The caption names the link, so the portrait is decorative.
defineProps<{ name: string; slug: string; profilePath: string | null }>();
</script>

<template>
  <Link
    :href="`/person/${slug}`"
    class="group flex flex-col items-center gap-1.5 rounded-lg focus-ring"
  >
    <span
      class="flex aspect-square w-full max-w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-elevated"
    >
      <img
        v-if="profilePath"
        :src="tmdbImage(profilePath, 'w185')"
        alt=""
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover"
      />
      <span v-else class="text-sm font-mono text-fg-muted" aria-hidden="true">
        {{ initials(name) }}
      </span>
    </span>
    <span class="favorite-caption text-center">{{ name }}</span>
  </Link>
</template>
