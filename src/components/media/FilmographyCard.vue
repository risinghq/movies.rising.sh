<script setup lang="ts">
import { Link } from "@void/vue";
import { tmdbImage } from "@/shared/tmdb-image";

defineProps<{
  title: string;
  subtitle?: string | null;
  year?: string | null;
  posterPath?: string | null;
  slug: string;
  seen?: boolean;
}>();
</script>

<template>
  <Link :href="`/media/${slug}`" class="group flex flex-col gap-2 focus-ring rounded-lg">
    <div class="poster-wrap relative rounded-lg overflow-hidden bg-bg-elevated">
      <span
        v-if="seen"
        class="absolute top-1.5 left-1.5 z-10 inline-flex items-center justify-center size-5 rounded-full bg-bg/80 backdrop-blur-sm border border-border/50 text-accent"
        title="seen"
      >
        <span class="i-lucide:check w-3 h-3" aria-hidden="true" />
        <span class="sr-only">seen</span>
      </span>
      <img
        v-if="posterPath"
        :src="tmdbImage(posterPath, 'w342')"
        :alt="title"
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center p-2 text-center text-fg-subtle text-xs font-mono"
      >
        {{ title }}
      </div>
    </div>
    <div class="flex flex-col gap-0.5 min-w-0">
      <span
        class="font-mono text-xs leading-snug line-clamp-2 text-fg group-hover:text-accent transition-colors"
      >
        {{ title }}
      </span>
      <span v-if="subtitle" class="font-mono text-[0.7rem] text-fg-muted leading-snug line-clamp-1">
        {{ subtitle }}
      </span>
      <span v-if="year" class="font-mono text-[0.65rem] text-fg-subtle">{{ year }}</span>
    </div>
  </Link>
</template>
