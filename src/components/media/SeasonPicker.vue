<script setup lang="ts">
import { nextTick, ref } from "vue";
import type { SeasonSummary } from "@/shared/catalog";
import { seasonName } from "@/shared/tracking";

const props = defineProps<{ seasons: SeasonSummary[]; picked: number | null }>();
const emit = defineEmits<{ pick: [seasonNumber: number] }>();

const tabs = ref<HTMLButtonElement[]>([]);

function optionText(s: SeasonSummary) {
  return s.seasonNumber === 0
    ? "specials"
    : `${seasonName(s.seasonNumber)} · ${s.episodeCount} episodes`;
}

function onSelect(e: Event) {
  emit("pick", Number((e.target as HTMLSelectElement).value));
}

function keyTarget(key: string, index: number): number | undefined {
  if (key === "Home") return 0;
  if (key === "End") return props.seasons.length - 1;
  const step = { ArrowRight: 1, ArrowLeft: -1 }[key];
  return step === undefined ? undefined : index + step;
}

// Roving tabindex: arrows, Home and End move the selection and the focus.
function onTabKey(e: KeyboardEvent, index: number) {
  const target = keyTarget(e.key, index);
  if (target === undefined || target < 0 || target >= props.seasons.length) return;
  e.preventDefault();
  emit("pick", props.seasons[target]!.seasonNumber);
  void nextTick(() => tabs.value[target]?.focus());
}
</script>

<template>
  <select
    :value="picked ?? ''"
    aria-label="season"
    class="select flex-1 min-w-0 sm:hidden"
    @change="onSelect"
  >
    <option v-for="s in seasons" :key="s.seasonNumber" :value="s.seasonNumber">
      {{ optionText(s) }}
    </option>
  </select>
  <div role="tablist" aria-label="seasons" class="seasons flex flex-1 min-w-0 max-sm:hidden">
    <button
      v-for="(s, index) in seasons"
      :key="s.seasonNumber"
      ref="tabs"
      type="button"
      role="tab"
      :aria-selected="s.seasonNumber === picked"
      :tabindex="s.seasonNumber === picked ? 0 : -1"
      aria-controls="season-episodes"
      :title="`${seasonName(s.seasonNumber)} · ${s.episodeCount} episodes`"
      @click="emit('pick', s.seasonNumber)"
      @keydown="onTabKey($event, index)"
    >
      {{ s.seasonNumber === 0 ? "sp" : s.seasonNumber }}
    </button>
  </div>
</template>
