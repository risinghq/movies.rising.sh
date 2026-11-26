<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

defineProps<{ text: string }>();

const expanded = ref(false);
const el = ref<HTMLElement>();
const clipped = ref(false);
const toggleLabel = computed(() => (expanded.value ? "show less" : "show more"));

onMounted(() => {
  if (el.value) clipped.value = el.value.scrollHeight > el.value.clientHeight + 1;
});
</script>

<template>
  <div class="text-sm font-mono text-fg-muted leading-relaxed max-w-prose">
    <p ref="el" class="whitespace-pre-line" :class="{ 'line-clamp-4': !expanded }" v-text="text" />
    <button
      v-if="clipped"
      type="button"
      class="mt-1 text-fg-subtle hover:text-accent transition-colors"
      @click="expanded = !expanded"
    >
      {{ toggleLabel }}
    </button>
  </div>
</template>
