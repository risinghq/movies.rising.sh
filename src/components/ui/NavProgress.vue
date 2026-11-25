<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useNavigation } from "@void/vue";

// A prefetched page commits within a frame or two; the bar waits SHOW_DELAY so
// those visits never flash it.
const SHOW_DELAY = 150;
const FINISH = 300;

const navigation = useNavigation();
const loading = computed(() => navigation.state === "loading");
const visible = ref(false);
const finishing = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

watch(loading, (now) => {
  clearTimeout(timer);
  if (now) {
    finishing.value = false;
    timer = setTimeout(() => (visible.value = true), SHOW_DELAY);
    return;
  }
  if (!visible.value) return;
  finishing.value = true;
  timer = setTimeout(() => {
    visible.value = false;
    finishing.value = false;
  }, FINISH);
});

onUnmounted(() => clearTimeout(timer));
</script>

<template>
  <div v-if="visible" class="nav-progress" :data-finishing="finishing || undefined" />
</template>

<style scoped>
.nav-progress {
  position: fixed;
  inset: 0 0 auto;
  z-index: 60;
  height: 2px;
  background: var(--accent);
  transform-origin: left;
  pointer-events: none;
  animation: nav-progress-grow 10s cubic-bezier(0.1, 0.7, 0.2, 1) forwards;
}

.nav-progress[data-finishing] {
  animation: nav-progress-finish 300ms ease-out forwards;
}

@keyframes nav-progress-grow {
  from {
    transform: scaleX(0.08);
  }
  to {
    transform: scaleX(0.9);
  }
}

@keyframes nav-progress-finish {
  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-progress {
    animation: none;
    opacity: 0.7;
  }
}
</style>
