<script setup lang="ts">
import { computed, ref } from "vue";
import type { FilmographyView } from "@/shared/types/metadata";
import FilmographyCard from "@/components/media/FilmographyCard.vue";

const props = defineProps<{ department: string; items: FilmographyView[] }>();

const expanded = ref(false);
const heading = computed(() => `${props.department.toLowerCase()} · ${props.items.length}`);
const canExpand = computed(() => props.items.length > 6 && !expanded.value);

// Two rows hold 6, 8 or 12 cards (3, 4 or 6 columns); the button hides at the
// widths where nothing is cut.
const overflowClass = computed(() => {
  const count = props.items.length;
  if (count > 12) return "";
  return count > 8 ? "md:hidden" : "sm:hidden";
});
</script>

<template>
  <section class="flex flex-col gap-4">
    <h2 class="text-sm font-mono text-fg-muted">{{ heading }}</h2>
    <div
      class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-5"
      :class="{ 'two-rows': !expanded }"
    >
      <FilmographyCard v-for="f in items" :key="f.key" v-bind="f" />
    </div>
    <button
      v-if="canExpand"
      type="button"
      class="self-start text-xs font-mono text-fg-muted hover:text-accent transition-colors"
      :class="overflowClass"
      @click="expanded = true"
    >
      show all {{ items.length }}
    </button>
  </section>
</template>

<style scoped>
.two-rows > :nth-child(n + 7) {
  display: none;
}

@media (min-width: 640px) {
  .two-rows > :nth-child(n + 7) {
    display: flex;
  }
  .two-rows > :nth-child(n + 9) {
    display: none;
  }
}

@media (min-width: 768px) {
  .two-rows > :nth-child(n + 9) {
    display: flex;
  }
  .two-rows > :nth-child(n + 13) {
    display: none;
  }
}
</style>
