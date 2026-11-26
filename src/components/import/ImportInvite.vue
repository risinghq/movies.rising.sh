<script setup lang="ts">
import { Link } from "@void/vue";
</script>

<template>
  <section class="flex flex-col items-center gap-3 py-12 text-center">
    <span class="i-lucide:clapperboard w-12 h-12 text-fg-subtle" aria-hidden="true" />
    <p class="font-mono text-fg-muted">nothing tracked yet</p>
    <p class="text-sm text-fg-subtle">
      press <kbd class="font-mono">⌘K</kbd> to search a title and log your first watch
    </p>
    <Link
      href="/import"
      class="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-bg-subtle px-4 py-3 text-sm hover:border-border-hover transition-colors"
    >
      <span class="i-lucide:download w-4 h-4 text-fg-muted" aria-hidden="true" />
      <span class="text-fg-muted">coming from another tracker?</span>
      <span class="font-mono text-fg">bring your history</span>
    </Link>
  </section>
</template>
