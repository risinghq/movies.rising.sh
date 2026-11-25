<script setup lang="ts">
import { computed, ref } from "vue";
import { Link } from "@void/vue";

const props = defineProps<{ companies: { name: string; href: string }[] }>();

const LIMIT = 3;
const open = ref(false);
const shown = computed(() => (open.value ? props.companies : props.companies.slice(0, LIMIT)));
const hidden = computed(() => props.companies.length - LIMIT);
</script>

<template>
  <span>
    <template v-for="(company, index) in shown" :key="company.href">
      <span v-if="index > 0" class="text-fg-subtle" aria-hidden="true"> · </span>
      <Link :href="company.href" class="company-link">{{ company.name }}</Link>
    </template>
    <template v-if="hidden > 0 && !open">
      <span class="text-fg-subtle" aria-hidden="true"> · </span>
      <button
        type="button"
        class="text-fg-subtle hover:text-fg transition-colors focus-ring"
        @click="open = true"
      >
        +{{ hidden }} more
      </button>
    </template>
  </span>
</template>
