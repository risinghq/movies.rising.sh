<script setup lang="ts">
import { Link } from "@void/vue";
import { tmdbImage } from "@/shared/tmdb-image";

defineProps<{
  name: string;
  slug: string;
  profilePath: string | null;
  knownForDepartment: string | null;
  knownFor: string[];
  active?: boolean;
}>();
</script>

<template>
  <Link
    :href="`/person/${slug}`"
    class="flex items-center gap-3 rounded-lg px-2 py-1.5 no-underline transition-colors"
    :class="active ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'"
    :data-active="active ? 'true' : undefined"
  >
    <div
      class="w-8 h-8 shrink-0 overflow-hidden rounded-full bg-bg-elevated flex items-center justify-center"
    >
      <img
        v-if="profilePath"
        :src="tmdbImage(profilePath, 'w185')"
        :alt="name"
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover"
      />
      <span v-else class="i-lucide:user w-4 h-4 text-fg-subtle" aria-hidden="true" />
    </div>
    <div class="min-w-0 flex flex-col">
      <span class="truncate font-mono text-sm text-fg">{{ name }}</span>
      <span class="truncate font-mono text-xs text-fg-subtle">
        <span class="lowercase">{{ knownForDepartment ?? "person" }}</span
        ><span v-if="knownFor.length"> · {{ knownFor.join(", ") }}</span>
      </span>
    </div>
  </Link>
</template>
