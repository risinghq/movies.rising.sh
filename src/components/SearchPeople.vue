<script setup lang="ts">
import PersonChip from "@/components/PersonChip.vue";
import type { PersonResult } from "@/composables/useMediaSearch";

defineProps<{
  people: PersonResult[];
  /** Set when the list is a preview; offers the full list of this many. */
  total?: number;
}>();

defineEmits<{ showAll: [] }>();
</script>

<template>
  <section class="flex flex-col gap-3" aria-label="people">
    <h3 v-if="total !== undefined" class="text-xs font-mono text-fg-subtle">people</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <PersonChip
        v-for="person in people"
        :key="person.tmdbId"
        :name="person.name"
        :slug="person.slug"
        :profile-path="person.profilePath"
        :subtitle="person.knownForDepartment?.toLowerCase()"
        :caption="person.knownFor.join(', ') || null"
      />
    </div>
    <button
      v-if="total !== undefined && total > people.length"
      type="button"
      class="self-start font-mono text-xs text-fg-muted hover:text-fg transition-colors focus-ring rounded"
      @click="$emit('showAll')"
    >
      all {{ total }} people →
    </button>
  </section>
</template>
