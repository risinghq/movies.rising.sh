<script setup lang="ts">
import { ref, useId } from "vue";

withDefaults(defineProps<{ size?: number }>(), { size: 20 });

const glowId = `logo-glow-${useId()}`;
const svg = ref<SVGSVGElement>();

// Replays the CSS strike from the start; a strike already running finishes first.
function play() {
  const animations = svg.value?.getAnimations({ subtree: true }) ?? [];
  if (animations.some((a) => a.playState === "running")) return;
  for (const a of animations) {
    a.currentTime = 0;
    a.play();
  }
}

defineExpose({ play });
</script>

<!-- Two watched cells and the next one. Filled vs outlined carries the meaning,
so the mark still reads in one colour when --accent is set to currentColor.
public/favicon.svg, apple-touch-icon.png and og.png draw the same geometry. -->
<template>
  <svg
    ref="svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
    class="logo-mark shrink-0 overflow-visible"
  >
    <defs>
      <filter :id="glowId" x="-100%" y="-50%" width="300%" height="200%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
    </defs>
    <!-- Opacity sits on the filtered group: Chromium paints the filter region
    black when it filters fully transparent children. -->
    <g class="glow" :filter="`url(#${glowId})`">
      <rect x="2" y="5" width="5.5" height="14" rx="1.5" />
    </g>
    <g class="glow glow-2" :filter="`url(#${glowId})`">
      <rect x="9.25" y="5" width="5.5" height="14" rx="1.5" />
    </g>
    <rect class="bar" x="2" y="5" width="5.5" height="14" rx="1.5" />
    <rect class="bar bar-2" x="9.25" y="5" width="5.5" height="14" rx="1.5" />
    <rect
      class="slot"
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

<style scoped>
.bar,
.glow {
  fill: var(--accent);
}

.glow {
  opacity: 0;
}

/* Neon tubes striking: each bar stutters on, its glow flares and fades, and
   the empty slot flickers once without lighting. */
@media (prefers-reduced-motion: no-preference) {
  .bar {
    animation: strike 1.1s both;
  }
  .glow {
    animation: flare 1.6s both;
  }
  .bar-2,
  .glow-2 {
    animation-delay: 160ms;
  }
  .slot {
    animation: falter 1.6s both;
  }
}

@keyframes strike {
  0% {
    opacity: 0.12;
    animation-timing-function: step-end;
  }
  8% {
    opacity: 1;
    animation-timing-function: step-end;
  }
  12% {
    opacity: 0.15;
    animation-timing-function: step-end;
  }
  20% {
    opacity: 1;
    animation-timing-function: step-end;
  }
  24% {
    opacity: 0.35;
    animation-timing-function: step-end;
  }
  34%,
  100% {
    opacity: 1;
  }
}

@keyframes flare {
  0% {
    opacity: 0;
    animation-timing-function: step-end;
  }
  6% {
    opacity: 0.9;
    animation-timing-function: step-end;
  }
  9% {
    opacity: 0;
    animation-timing-function: step-end;
  }
  15% {
    opacity: 0.9;
    animation-timing-function: step-end;
  }
  18% {
    opacity: 0.2;
    animation-timing-function: step-end;
  }
  24% {
    opacity: 0.9;
    animation-timing-function: ease-out;
  }
  100% {
    opacity: 0;
  }
}

@keyframes falter {
  0%,
  55% {
    opacity: 1;
    animation-timing-function: step-end;
  }
  58% {
    opacity: 0.3;
    animation-timing-function: step-end;
  }
  62%,
  100% {
    opacity: 1;
  }
}
</style>
