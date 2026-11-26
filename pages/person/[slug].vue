<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "@void/vue";
import type { Props } from "./[slug].server";
import { genderLabel } from "@/domain/catalog/people";
import FilmographySection from "@/components/person/FilmographySection.vue";
import PersonBio from "@/components/person/PersonBio.vue";
import { tmdbImage } from "@/shared/tmdb-image";

const props = defineProps<Props>();
const router = useRouter();

const favorited = ref(props.isFavorited);
const favBusy = ref(false);
const favError = ref("");

const gender = computed(() => genderLabel(props.person.gender));

const age = computed(() => {
  if (!props.person.birthday) return null;
  const birth = new Date(props.person.birthday);
  const end = props.person.deathday ? new Date(props.person.deathday) : new Date();
  let years = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) years -= 1;
  return years >= 0 ? years : null;
});

const meta = computed(() => {
  const parts: string[] = [];
  if (gender.value) parts.push(gender.value);
  if (age.value !== null)
    parts.push(props.person.deathday ? `${age.value} (deceased)` : String(age.value));
  if (props.person.birthday) parts.push(`b. ${props.person.birthday}`);
  if (props.person.placeOfBirth) parts.push(props.person.placeOfBirth);
  return parts;
});

const seenCount = computed(
  () =>
    new Set(props.sections.flatMap((s) => s.items.filter((i) => i.seen).map((i) => i.slug))).size,
);
const filter = ref<"all" | "seen">("all");
const FILTERS = computed(() => [
  { id: "all" as const, label: "all" },
  { id: "seen" as const, label: `seen · ${seenCount.value}` },
]);
const shownSections = computed(() =>
  filter.value === "all"
    ? props.sections
    : props.sections
        .map((s) => ({ ...s, items: s.items.filter((i) => i.seen) }))
        .filter((s) => s.items.length > 0),
);

async function toggleFavorite() {
  if (!props.user) {
    void router.visit("/login");
    return;
  }
  favBusy.value = true;
  favError.value = "";
  try {
    const res = await fetch("/api/user/favorites", {
      method: favorited.value ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "person", personId: props.person.id }),
    });
    if (!res.ok) {
      const p = (await res.json()) as { error?: string };
      throw new Error(p.error ?? "failed");
    }
    favorited.value = !favorited.value;
  } catch (e) {
    favError.value = e instanceof Error ? e.message : "failed";
  } finally {
    favBusy.value = false;
  }
}
</script>

<template>
  <main class="container flex flex-col gap-10 py-8 sm:py-12">
    <section class="flex flex-col sm:flex-row gap-6 motion-safe:animate-slide-up animate-fill-both">
      <div class="shrink-0 w-32 sm:w-40">
        <div class="poster-wrap rounded-xl overflow-hidden bg-bg-elevated">
          <img
            v-if="person.profilePath"
            :src="tmdbImage(person.profilePath, 'w342')"
            :alt="person.name"
            loading="eager"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-fg-subtle">
            <span class="i-lucide:user w-8 h-8" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 flex-1 min-w-0">
        <div class="flex flex-col gap-1">
          <h1 class="text-3xl font-mono font-bold">{{ person.name }}</h1>
          <p v-if="meta.length" class="text-sm font-mono text-fg-muted">{{ meta.join(" · ") }}</p>
          <p v-if="person.knownForDepartment" class="text-xs font-mono text-fg-subtle">
            {{ person.knownForDepartment }}
          </p>
        </div>

        <button
          v-if="user"
          type="button"
          class="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-mono transition-colors focus-ring"
          :class="
            favorited
              ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15'
              : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg'
          "
          :disabled="favBusy"
          @click="toggleFavorite"
        >
          <span
            class="w-4 h-4"
            :class="favorited ? 'i-lucide:heart-off' : 'i-lucide:heart'"
            aria-hidden="true"
          />
          {{ favorited ? "unfavorite" : "favorite" }}
        </button>

        <PersonBio v-if="person.biography" :text="person.biography" />

        <p v-if="favError" class="text-sm text-red-400 font-mono">{{ favError }}</p>
      </div>
    </section>

    <div v-if="seenCount" class="flex items-center gap-1 -mb-4" role="group" aria-label="show">
      <button
        v-for="option in FILTERS"
        :key="option.id"
        type="button"
        class="px-3 py-1.5 rounded-md text-xs font-mono transition-colors focus-ring"
        :class="filter === option.id ? 'bg-bg-muted text-fg' : 'text-fg-muted hover:text-fg'"
        :aria-pressed="filter === option.id"
        @click="filter = option.id"
      >
        {{ option.label }}
      </button>
    </div>

    <FilmographySection
      v-for="section in shownSections"
      :key="`${filter}-${section.department}`"
      v-bind="section"
    />
  </main>
</template>
