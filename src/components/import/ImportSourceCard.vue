<script setup lang="ts">
defineProps<{ name: string; brings: string }>();
</script>

<template>
  <li class="flex flex-col gap-3 rounded-xl border border-border bg-bg-subtle p-4">
    <div class="flex flex-col gap-1">
      <span class="font-mono text-fg">{{ name }}</span>
      <p class="text-sm text-fg-muted">{{ brings }}</p>
      <p v-if="$slots.note" class="text-xs text-fg-subtle"><slot name="note" /></p>
    </div>
    <div class="self-start mt-auto"><slot /></div>
  </li>
</template>
