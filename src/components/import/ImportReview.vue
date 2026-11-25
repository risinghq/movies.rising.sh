<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "@void/vue";
import Btn from "@/components/ui/Btn.vue";
import SettingsSection from "@/components/settings/SettingsSection.vue";
import { importMessage, startImport } from "@/composables/useImportApi";
import type { ImportSummary } from "@/shared/import";
import { formatCount, formatDay, skippedLabel } from "./format";

const props = defineProps<{ id: string; sourceName: string; summary: ImportSummary }>();
const router = useRouter();

const BATCH_PREVIEW = 5;
const days = computed(() => [...props.summary.batchDays].sort((a, b) => b.plays - a.plays));
const showAllDays = ref(false);
const shownDays = computed(() =>
  showAllDays.value ? days.value : days.value.slice(0, BATCH_PREVIEW),
);
const undated = ref(
  new Set(props.summary.batchDays.filter((d) => d.undatedByDefault).map((d) => d.day)),
);
const undatedPlays = computed(() =>
  days.value.filter((d) => undated.value.has(d.day)).reduce((sum, d) => sum + d.plays, 0),
);

function toggle(day: string) {
  const next = new Set(undated.value);
  if (next.has(day)) next.delete(day);
  else next.add(day);
  undated.value = next;
}

const counts = computed(() =>
  [
    [props.summary.titles, "title", "titles"],
    [props.summary.plays, "play", "plays"],
    [props.summary.ratings, "rating", "ratings"],
    [props.summary.planned, "to watch", "to watch"],
    [props.summary.favorites, "favorite", "favorites"],
    [props.summary.dropped, "dropped show", "dropped shows"],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, one, many]) => formatCount(n as number, one as string, many as string)),
);
const skipped = computed(() =>
  Object.entries(props.summary.skipped).map(([reason, n]) => skippedLabel(reason, n)),
);

const ratingsSkipped = computed(
  () => "episode_rating" in props.summary.skipped || "season_rating" in props.summary.skipped,
);

const starting = ref(false);
const error = ref("");

async function start() {
  starting.value = true;
  error.value = "";
  const result = await startImport(props.id, [...undated.value]);
  if (!result.ok) {
    starting.value = false;
    error.value = importMessage(result.error);
    return;
  }
  void router.visit(`/import?id=${props.id}`, { replace: true });
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <section class="flex flex-col gap-2">
      <p class="font-mono text-fg">found in your {{ props.sourceName }} account</p>
      <p class="text-sm text-fg-muted">{{ counts.join(" · ") }}</p>
      <p class="text-xs text-fg-subtle">
        nothing is written yet. a score or status you already set here stays as it is.
      </p>
    </section>

    <SettingsSection
      v-if="days.length"
      title="plays marked in bulk"
      hint="on these days many plays were marked at once, which usually means a backfill rather than real watch dates. a checked day imports its plays as watched without a date, so they count toward progress but stay out of your heatmap and recaps."
    >
      <label
        v-for="day in shownDays"
        :key="day.day"
        class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-bg-muted transition-colors"
      >
        <input
          type="checkbox"
          class="accent-[var(--color-accent)]"
          :checked="undated.has(day.day)"
          @change="toggle(day.day)"
        />
        <span class="font-mono text-sm text-fg">{{ formatDay(day.day) }}</span>
        <span class="ms-auto text-xs font-mono text-fg-subtle">
          {{ formatCount(day.plays, "play", "plays") }}
        </span>
      </label>
      <button
        v-if="days.length > BATCH_PREVIEW"
        type="button"
        class="w-full px-4 py-2 text-xs font-mono text-fg-muted hover:text-fg text-start"
        @click="showAllDays = !showAllDays"
      >
        {{ showAllDays ? "show fewer" : `show all ${days.length} days` }}
      </button>
    </SettingsSection>

    <section v-if="skipped.length" class="flex flex-col gap-1">
      <h2 class="text-xs font-mono text-fg-subtle uppercase tracking-wider">not imported</h2>
      <p class="text-sm text-fg-muted">{{ skipped.join(" · ") }}</p>
      <p v-if="ratingsSkipped" class="text-xs text-fg-subtle">
        scores here belong to whole titles, so episode and season ratings stay behind.
      </p>
    </section>

    <div class="flex flex-wrap items-center gap-3">
      <Btn variant="primary" classicon="i-lucide:download" :disabled="starting" @click="start">
        {{ starting ? "starting..." : "import" }}
      </Btn>
      <a href="/import" class="text-sm font-mono text-fg-muted hover:text-fg">not now</a>
      <span v-if="undatedPlays" class="text-xs text-fg-subtle">
        {{ formatCount(undatedPlays, "play", "plays") }} without a date
      </span>
    </div>
    <p v-if="error" role="alert" class="text-xs text-red-400 font-mono">{{ error }}</p>
  </div>
</template>
