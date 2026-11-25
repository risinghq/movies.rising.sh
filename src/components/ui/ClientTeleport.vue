<script setup lang="ts">
import { onMounted, ref } from "vue";

defineProps<{ to: string }>();

// Void's SSR drops Vue's teleport buffer, so a server-rendered Teleport leaves no
// target anchor and hydration mismatches. Content teleported here renders on the
// client only, so it must not be needed for the first paint.
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});
</script>

<template>
  <Teleport v-if="mounted" :to="to">
    <slot />
  </Teleport>
</template>
