<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 20 });
</script>

<!-- Two watched cells and the next one. Filled vs outlined carries the meaning,
so the mark still reads in one colour when --accent is set to currentColor.
public/favicon.svg, apple-touch-icon.png and og.png draw the same geometry. -->
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true" class="shrink-0">
    <rect x="2" y="5" width="5.5" height="14" rx="1.5" style="fill: var(--accent)" />
    <rect x="9.25" y="5" width="5.5" height="14" rx="1.5" style="fill: var(--accent)" />
    <rect
      x="17.25"
      y="5.75"
      width="4"
      height="12.5"
      rx="1"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    />
  </svg>
</template>
