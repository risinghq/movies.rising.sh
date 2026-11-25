<script setup lang="ts">
import { Link } from "@void/vue";

// A title still being hydrated has no slug yet, so it renders without a link.
defineProps<{ slug?: string | null }>();
</script>

<template>
  <Link v-if="slug" :href="`/media/${slug}`"><slot /></Link>
  <span v-else><slot /></span>
</template>
