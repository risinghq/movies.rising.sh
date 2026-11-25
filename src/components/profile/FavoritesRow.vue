<script setup lang="ts" generic="T extends { key: string }">
import { computed, ref, useId } from "vue";
import { COLLAPSED_MAX, collapsedItemClass, collapsedToggleClass } from "./favorites";

const props = defineProps<{ label: string; items: T[] }>();

const expanded = ref(false);
const gridId = useId();

const rendered = computed(() =>
  expanded.value ? props.items : props.items.slice(0, COLLAPSED_MAX),
);
const toggleClass = computed(() =>
  expanded.value ? "" : collapsedToggleClass(props.items.length),
);
</script>

<template>
  <!-- From sm the columns have fixed widths: w-fit ends the toggle with the grid. -->
  <div class="flex flex-col gap-3 sm:w-fit">
    <div class="flex items-center justify-between gap-3 min-h-11 sm:min-h-8 -my-2.5 sm:-my-1">
      <h3 class="text-[0.6875rem] font-mono text-fg-subtle">{{ label }} · {{ items.length }}</h3>
      <button
        type="button"
        :class="toggleClass"
        class="min-h-11 sm:min-h-8 text-[0.6875rem] font-mono quiet-link rounded"
        :aria-expanded="expanded"
        :aria-controls="gridId"
        @click="expanded = !expanded"
      >
        {{ expanded ? "show less" : `show all ${items.length}` }}
      </button>
    </div>
    <ul
      :id="gridId"
      class="grid grid-cols-4 gap-x-2.5 gap-y-3.5 sm:(grid-cols-[repeat(6,5rem)] gap-x-4 gap-y-5) lg:grid-cols-[repeat(8,5rem)]"
    >
      <li
        v-for="(item, index) in rendered"
        :key="item.key"
        :class="expanded ? '' : collapsedItemClass(index)"
      >
        <slot :item="item" />
      </li>
    </ul>
  </div>
</template>
