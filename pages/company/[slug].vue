<script setup lang="ts">
import { computed } from "vue";
import { Link } from "@void/vue";
import type { Props } from "./[slug].server";
import CompanyFilterNav from "@/components/company/CompanyFilterNav.vue";
import CompanyHeader from "@/components/company/CompanyHeader.vue";
import CompanyTitles from "@/components/company/CompanyTitles.vue";
import { companyLabel, companySlug, type CompanyFilter } from "@/shared/company";

const props = defineProps<Props>();

const slug = companySlug(props.company.kind, props.company.tmdbId);
// TMDB lists no movies for a network, so a network page shows no filter.
const filterable = props.company.kind !== "network";
const emptyNoun = computed(() => ({ all: "titles", movie: "movies", show: "shows" })[props.filter]);

function filterHref(filter: CompanyFilter) {
  return filter === "all" ? `/company/${slug}` : `/company/${slug}?type=${filter}`;
}
</script>

<template>
  <main class="flex-1 font-mono">
    <CompanyHeader :company="company" />

    <div class="container w-full flex flex-col gap-4 pt-4 pb-10 sm:(gap-5 pt-5 pb-16)">
      <div class="flex flex-col gap-2 sm:(flex-row items-center justify-between)">
        <CompanyFilterNav v-if="filterable" :filter="filter" :href="filterHref" />
        <span class="text-xs text-fg-subtle">sorted by popularity</span>
      </div>

      <div
        v-if="failed"
        class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-5 py-7 text-center"
      >
        <p class="text-sm text-fg">couldn't reach TMDB</p>
        <a :href="filterHref(filter)" class="box-action">try again</a>
      </div>

      <div
        v-else-if="titles.length === 0"
        class="flex flex-col items-center gap-3.5 rounded-lg border border-dashed border-border px-5 py-12 text-center"
      >
        <p class="text-sm text-fg">no titles</p>
        <p class="max-w-[26ch] text-xs leading-normal text-fg-subtle">
          TMDB has no {{ emptyNoun }} for this {{ companyLabel(company.kind) }}.
        </p>
        <Link v-if="filter !== 'all'" :href="filterHref('all')" class="box-action">show all</Link>
      </div>

      <CompanyTitles
        v-else
        :slug="slug"
        :filter="filter"
        :initial="titles"
        :initial-has-more="hasMore"
      />
    </div>
  </main>
</template>
