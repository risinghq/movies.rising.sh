<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Link } from "@void/vue";
import type { MediaSummary } from "@/shared/catalog";
import { yearOf } from "@/shared/format-media";
import { tmdbImage } from "@/components/tmdb-image";

const props = defineProps<{
  media: MediaSummary;
  page: "overview" | "cast" | "crew" | "timeline";
}>();

const links = computed(() => [
  { page: "overview", label: "overview", href: `/media/${props.media.slug}` },
  { page: "cast", label: "cast", href: `/media/${props.media.slug}/cast` },
  { page: "crew", label: "crew", href: `/media/${props.media.slug}/crew` },
  { page: "timeline", label: "community", href: `/media/${props.media.slug}/timeline` },
]);

// TMDB scores are out of 10; the app shows a five-point scale.
const meta = computed(() =>
  [
    yearOf(props.media.releaseDate),
    props.media.mediaType,
    props.media.voteAverage ? `TMDB ${(props.media.voteAverage / 2).toFixed(1)}` : null,
  ].filter(Boolean),
);

const overview = ref<HTMLElement>();
const overviewOpen = ref(false);
const overviewClipped = ref(false);
onMounted(() => {
  const el = overview.value;
  if (el) overviewClipped.value = el.scrollHeight > el.clientHeight + 1;
});
</script>

<template>
  <header
    class="w-full container grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3.5 gap-y-3 pt-4 pb-4 sm:(grid-cols-[6.5rem_minmax(0,1fr)] gap-x-6 gap-y-2 pt-7 pb-6)"
  >
    <div
      class="poster-wrap self-start sm:row-span-2 rounded-md overflow-hidden border border-border bg-bg-elevated"
    >
      <img
        v-if="media.posterPath"
        :src="tmdbImage(media.posterPath, 'w185')"
        :alt="`${media.title} poster`"
        loading="eager"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-fg-subtle text-[0.625rem] font-mono"
      >
        no poster
      </div>
    </div>

    <div class="flex flex-col gap-1.5 sm:gap-2 min-w-0 self-end sm:self-start">
      <h1
        class="font-mono text-[1.375rem] sm:text-[2rem] font-semibold leading-[1.15] sm:leading-[1.1] sm:tracking-[-0.01em] break-words"
      >
        <Link v-if="page !== 'overview'" :href="`/media/${media.slug}`" class="hover:text-accent">
          {{ media.title }}
        </Link>
        <span v-else>{{ media.title }}</span>
      </h1>
      <p v-if="meta.length" class="font-mono text-xs sm:text-[0.8125rem] text-fg-muted">
        {{ meta.join(" · ") }}
      </p>
      <p v-if="media.tagline" class="font-mono text-[0.8125rem] sm:text-sm italic">
        {{ media.tagline }}
      </p>
    </div>

    <div
      v-if="media.overview"
      class="col-span-2 sm:(col-span-1 col-start-2) flex flex-col items-start gap-2 min-w-0"
    >
      <p
        :id="`overview-${media.id}`"
        ref="overview"
        class="max-w-[68ch] font-sans text-[0.9375rem] leading-[1.6] text-fg-muted text-pretty"
        :class="{ 'media-summary': !overviewOpen }"
      >
        {{ media.overview }}
      </p>
      <button
        v-if="overviewClipped"
        type="button"
        class="min-h-8 sm:min-h-0 -mt-1.5 sm:mt-0 font-mono text-[0.8125rem] text-accent hover:underline underline-offset-3 focus-ring"
        :aria-expanded="overviewOpen"
        :aria-controls="`overview-${media.id}`"
        @click="overviewOpen = !overviewOpen"
      >
        {{ overviewOpen ? "less" : "more" }}
      </button>
    </div>
  </header>

  <div class="w-full bg-bg z-40 border-b border-border" data-testid="media-subheader">
    <!-- wrap-reverse: on a narrow phone the actions take their own line above
         the tabs, so the tab underline stays on the bottom border. -->
    <div class="w-full container flex flex-wrap-reverse items-center justify-between gap-x-3">
      <nav
        aria-label="title navigation"
        class="flex shrink-0 max-w-full gap-3 sm:gap-6 -mb-px overflow-x-auto font-mono text-[0.8125rem] sm:text-[0.9375rem] media-nav"
      >
        <Link
          v-for="link in links"
          :key="link.page"
          :href="link.href"
          :aria-current="page === link.page ? 'page' : undefined"
          class="shrink-0 decoration-none border-b-2 pt-3 pb-2.5 sm:px-0.5 hover:border-accent/50 focus-visible:[outline-offset:-2px]!"
          :class="page === link.page ? 'border-accent text-accent!' : 'border-transparent'"
        >
          {{ link.label }}
        </Link>
      </nav>

      <div v-if="$slots.actions" class="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.media-nav {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.media-nav::-webkit-scrollbar {
  display: none;
}

.media-summary {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
