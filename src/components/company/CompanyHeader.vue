<script setup lang="ts">
import type { CompanyKind } from "@/shared/company";
import { companyLabel } from "@/shared/company";
import { regionName } from "@/shared/locale";

defineProps<{
  company: {
    name: string;
    kind: CompanyKind;
    logoPath: string | null;
    originCountry: string | null;
  };
}>();
</script>

<template>
  <div class="border-b border-border">
    <header class="container w-full flex items-center gap-3.5 py-4 sm:(gap-5 pt-6 pb-5)">
      <div
        v-if="company.logoPath"
        class="flex h-12 w-21 flex-none items-center justify-center rounded-md bg-logo-tile p-1.75 sm:(h-16 w-28 p-2.5)"
      >
        <img
          :src="`https://image.tmdb.org/t/p/w185${company.logoPath}`"
          :alt="`${company.name} logo`"
          class="max-h-full max-w-full object-contain"
        />
      </div>
      <div class="flex min-w-0 flex-col gap-1.5">
        <h1 class="text-xl font-semibold leading-tight text-fg sm:text-[1.75rem]">
          {{ company.name }}
        </h1>
        <p class="flex items-center gap-2 text-xs text-fg-muted">
          <span class="flex h-5.5 items-center rounded-md border border-border px-2 text-fg">
            {{ companyLabel(company.kind) }}
          </span>
          <template v-if="company.originCountry">{{ regionName(company.originCountry) }}</template>
        </p>
      </div>
    </header>
  </div>
</template>
