<script setup lang="ts">
import type { CompanyFilter } from "@/shared/company";

defineProps<{ filter: CompanyFilter; href: (filter: CompanyFilter) => string }>();

const FILTERS: { value: CompanyFilter; label: string }[] = [
  { value: "all", label: "all" },
  { value: "movie", label: "movies" },
  { value: "show", label: "shows" },
];
</script>

<template>
  <nav
    aria-label="filter titles"
    class="grid grid-cols-3 gap-0.5 rounded-lg border border-border bg-bg-subtle p-0.75 sm:flex"
  >
    <a
      v-for="opt in FILTERS"
      :key="opt.value"
      :href="href(opt.value)"
      :aria-current="filter === opt.value ? 'page' : undefined"
      class="flex h-9.5 items-center justify-center rounded-[5px] px-3.5 text-[0.8125rem] transition-colors focus-ring sm:h-7.5"
      :class="filter === opt.value ? 'bg-bg-elevated text-fg' : 'text-fg-muted hover:text-fg'"
    >
      {{ opt.label }}
    </a>
  </nav>
</template>
