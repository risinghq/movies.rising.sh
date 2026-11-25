<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Props } from "./index.server";
import { useTracking } from "@/composables/useTracking";
import { useToast } from "@/composables/useToast";
import { useHydrationPoll } from "@/composables/useHydrationPoll";
import CompanyLinks from "@/components/media/CompanyLinks.vue";
import EpisodeList from "@/components/media/EpisodeList.vue";
import FavoriteButton from "@/components/media/FavoriteButton.vue";
import MediaHeader from "@/components/media/MediaHeader.vue";
import { LIBRARY_STATUSES } from "@/shared/library-status";
import { airedText, episodeSummary, runtimeText } from "@/shared/format-media";
import { mediaStatusLabel } from "@/shared/media-status";
import type { EpisodeRecord, SeasonEpisodes, SeasonSummary } from "@/domain/catalog/episodes";
import type { ShowViewDto } from "@/shared/tracking";
import { companySlug, type CompanyKind } from "@/shared/company";
import { languageName } from "@/shared/locale";

const props = defineProps<Props>();
const toast = useToast();

const seasons = ref<SeasonSummary[]>(props.seasons);
// Episodes are public catalog data, so a loaded season stays loaded across
// show-view refreshes, which update only the watched marks and counts.
const seasonEpisodes = ref(new Map<number, EpisodeRecord[]>());
storeSeason(props.openSeason);
const seasonCount = ref(props.media.seasonCount);
const episodeTotal = ref(props.media.episodeCount);
const episodeHydrationError = ref(props.media.episodesError);

const watchedKeys = ref<string[]>([...props.watchedEpisodeKeys]);
const canLogEpisodes = computed(() => !!props.user);
const isShow = props.media.mediaType === "show";

// The header reflects season/episode counts that can arrive after episode
// hydration, so feed it a media object with the live counts merged in.
const liveMedia = computed(() => ({
  ...props.media,
  seasonCount: seasonCount.value,
  episodeCount: episodeTotal.value,
}));

async function fetchShowView(): Promise<ShowViewDto> {
  const res = await fetch(`/api/tracking/show-view?mediaId=${encodeURIComponent(props.media.id)}`);
  const payload = (await res.json()) as ShowViewDto & { error?: { kind?: string } };
  if (!res.ok) throw new Error(payload.error?.kind ?? "request failed");
  return payload;
}

function storeSeason(season: SeasonEpisodes | null) {
  if (!season) return;
  seasonEpisodes.value = new Map(seasonEpisodes.value).set(season.seasonNumber, season.episodes);
}

async function loadSeason(seasonNumber: number) {
  const query = `mediaId=${encodeURIComponent(props.media.id)}&season=${seasonNumber}`;
  const res = await fetch(`/api/media/episodes?${query}`);
  if (!res.ok) throw new Error("request failed");
  storeSeason({ seasonNumber, episodes: (await res.json()) as EpisodeRecord[] });
}

function applyShowView(view: ShowViewDto) {
  seasons.value = view.seasons;
  storeSeason(view.openSeason);
  seasonCount.value = view.seasonCount;
  episodeTotal.value = view.episodeCount;
  watchedKeys.value = view.watchedKeys;
  episodeHydrationError.value = view.episodesError;
}

const { start: startHydrationPoll } = useHydrationPoll<ShowViewDto>({
  fetch: fetchShowView,
  isDone: (view) => view.hydrationState !== "stub",
  onData: applyShowView,
});

const showAwaitingEpisodes = computed(
  () => isShow && seasons.value.length === 0 && !episodeHydrationError.value,
);

async function onLogEpisode(seasonNumber: number, episodeNumber: number) {
  const ok = await logEpisode(seasonNumber, episodeNumber);
  if (!ok) return;
  const k = `${seasonNumber}:${episodeNumber}`;
  if (!watchedKeys.value.includes(k)) watchedKeys.value = [...watchedKeys.value, k];
}

async function onUnlogEpisode(seasonNumber: number, episodeNumber: number) {
  const ok = await unwatch(seasonNumber, episodeNumber);
  if (!ok) return;
  const k = `${seasonNumber}:${episodeNumber}`;
  watchedKeys.value = watchedKeys.value.filter((key) => key !== k);
}

// Require a second click before discarding watch history. The delay replaces a
// confirmation modal for this destructive action.
const confirmRemove = ref(false);
let confirmTimer: ReturnType<typeof setTimeout> | undefined;
function onRemoveClick() {
  if (!confirmRemove.value) {
    confirmRemove.value = true;
    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => (confirmRemove.value = false), 3000);
    return;
  }
  clearTimeout(confirmTimer);
  confirmRemove.value = false;
  void onUntrack();
}
async function onUntrack() {
  const removed = await untrack();
  if (removed) {
    watchedKeys.value = [];
    toast.info("removed from your library");
  }
}

async function onQuickLogEpisode() {
  const ok = await logWatch();
  if (!ok) return;
  // A provisional quick-log on a not-yet-hydrated show: refresh once so watched
  // marks reflect the new event without waiting for the next poll tick.
  if (showAwaitingEpisodes.value) {
    try {
      applyShowView(await fetchShowView());
    } catch {
      // Transient; the background poll (if running) will catch up.
    }
  }
}

const {
  entry,
  saving,
  displayStatus,
  displayScore,
  scoreMax,
  watchedCount,
  canLogEpisode,
  setStatus,
  setScore,
  logWatch,
  logEpisode,
  unwatch,
  untrack,
} = useTracking({
  mediaId: props.media.id,
  mediaType: props.media.mediaType,
  episodeTotal,
  ratingSystem: props.ratingSystem,
  initialEntry: props.libraryEntry
    ? {
        id: props.libraryEntry.id,
        filedStatus: props.libraryEntry.filedStatus,
        score100: props.libraryEntry.score100,
        watchedEpisodeCount: props.watchedEpisodeCount,
        updatedAt: Date.now(),
      }
    : null,
});

function companyLinks(kind: CompanyKind) {
  return props.companies
    .filter((c) => c.kind === kind)
    .map((c) => ({ name: c.name, href: `/company/${companySlug(c.kind, c.tmdbId)}` }));
}
const networks = computed(() => companyLinks("network"));
const studios = computed(() => companyLinks("company"));
const genresText = computed(() => props.genres.map((g) => g.name).join(" · "));
const language = computed(() =>
  props.media.originalLanguage ? languageName(props.media.originalLanguage) : null,
);
const seasonsText = computed(() =>
  isShow ? episodeSummary(seasonCount.value, episodeTotal.value) : null,
);
const runtime = computed(() => (isShow ? null : runtimeText(props.media.runtime)));
// "Released" says nothing the date does not already say.
const aired = computed(() => {
  const dates = airedText(props.media.releaseDate, props.media.lastAirDate, isShow);
  const status = props.media.status === "Released" ? null : mediaStatusLabel(props.media.status);
  return [dates, status?.toLowerCase()].filter(Boolean).join(" · ") || null;
});
const showOtherTitles = ref(false);

const logLabel = computed(() => {
  if (saving.value) return "saving…";
  if (!isShow) return watchedCount.value > 0 ? "log a rewatch" : "log watch";
  return canLogEpisode.value ? "+1 episode" : "all episodes logged";
});

async function onStatusChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const saved = await setStatus(target.value as (typeof LIBRARY_STATUSES)[number]);
  if (!saved) target.value = displayStatus.value ?? "";
}

async function onScoreChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const saved = await setScore(Number(target.value));
  if (!saved) target.value = displayScore.value === null ? "" : String(displayScore.value);
}

onMounted(() => {
  if (showAwaitingEpisodes.value) startHydrationPoll();
});
</script>

<template>
  <main class="flex-1">
    <MediaHeader :media="liveMedia" page="overview">
      <template #actions>
        <FavoriteButton :media-id="media.id" :initial="isFavorited" :logged-in="!!user" />
        <span
          v-if="entry"
          class="title-action"
          title="in your library"
          aria-label="in your library"
        >
          <span class="i-lucide:library size-[1.1em]" aria-hidden="true" />
          <span class="max-sm:sr-only">library</span>
        </span>
        <a v-else-if="!user" href="/login" class="title-action" aria-label="sign in to track">
          <span class="i-lucide:plus size-[1.1em]" aria-hidden="true" />
          <span class="max-sm:sr-only">track</span>
        </a>
      </template>
    </MediaHeader>

    <article
      class="container w-full grid gap-7 pt-4 pb-10 sm:(pt-6 pb-16) lg:(grid-cols-[minmax(0,1fr)_20rem] gap-x-16 gap-y-6 items-start)"
    >
      <!-- Setting status, rating, or watch progress registers the title in the library. -->
      <aside v-if="user" class="flex flex-col gap-1.5 lg:(col-start-2 row-start-1 gap-2)">
        <section
          aria-label="your tracking"
          class="flex flex-col gap-3.5 rounded-lg border border-border bg-bg-subtle p-3.5 sm:p-4 font-mono"
        >
          <div class="flex items-center gap-2 sm:gap-2.5">
            <select
              :value="displayStatus ?? ''"
              :disabled="saving"
              class="select flex-1 min-w-0"
              aria-label="library status"
              @change="onStatusChange"
            >
              <option value="" disabled>not tracking</option>
              <option v-for="status in LIBRARY_STATUSES" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
            <input
              type="number"
              inputmode="numeric"
              :min="0"
              :max="scoreMax"
              :value="displayScore ?? ''"
              placeholder="0"
              :disabled="saving"
              class="number"
              aria-label="your rating"
              @change="onScoreChange"
            />
            <span class="text-xs text-fg-subtle">/ {{ scoreMax }}</span>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-xs text-fg-subtle">
              <template v-if="isShow">
                <span class="text-fg">{{ watchedCount }}</span>
                <template v-if="episodeTotal !== null"> / {{ episodeTotal }}</template>
                episodes
              </template>
              <template v-else-if="watchedCount > 0">watched</template>
              <template v-else>not watched yet</template>
            </span>
            <button
              type="button"
              class="h-11 sm:h-10 rounded-md bg-fg text-bg text-sm font-semibold transition-colors hover:bg-fg/90 disabled:opacity-60 focus-ring"
              :disabled="saving || (isShow && !canLogEpisode)"
              @click="isShow ? onQuickLogEpisode() : logWatch()"
            >
              {{ logLabel }}
            </button>
          </div>
        </section>

        <button
          v-if="entry"
          type="button"
          class="self-end min-h-9 sm:min-h-0 px-0.5 py-1 font-mono text-xs transition-colors hover:text-red-400 disabled:opacity-60 focus-ring"
          :class="confirmRemove ? 'text-red-400' : 'text-fg-subtle'"
          :disabled="saving"
          @click="onRemoveClick"
        >
          {{ confirmRemove ? "confirm?" : "remove" }}
        </button>
      </aside>

      <section
        class="font-mono text-sm min-w-0"
        :class="user ? 'lg:(col-start-1 row-start-1)' : 'lg:col-span-2'"
      >
        <h2 class="mb-3 text-[0.8125rem] font-medium text-fg-muted">details</h2>
        <dl
          class="grid grid-cols-[5.25rem_minmax(0,1fr)] sm:grid-cols-[6rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4 gap-y-2.5 leading-normal"
        >
          <template v-if="seasonsText">
            <dt class="text-fg-subtle">episodes</dt>
            <dd>{{ seasonsText }}</dd>
          </template>
          <template v-if="runtime">
            <dt class="text-fg-subtle">runtime</dt>
            <dd>{{ runtime }}</dd>
          </template>
          <template v-if="genresText">
            <dt class="text-fg-subtle">genres</dt>
            <dd>{{ genresText }}</dd>
          </template>
          <template v-if="networks.length">
            <dt class="text-fg-subtle">network</dt>
            <dd><CompanyLinks :companies="networks" /></dd>
          </template>
          <template v-if="studios.length">
            <dt class="text-fg-subtle">studios</dt>
            <dd><CompanyLinks :companies="studios" /></dd>
          </template>
          <template v-if="language">
            <dt class="text-fg-subtle">language</dt>
            <dd>{{ language }}</dd>
          </template>
          <template v-if="aired">
            <dt class="text-fg-subtle">{{ isShow ? "aired" : "released" }}</dt>
            <dd>{{ aired }}</dd>
          </template>
          <template v-if="media.certification">
            <dt class="text-fg-subtle">rating</dt>
            <dd>{{ media.certification }}</dd>
          </template>
        </dl>

        <template v-if="altTitles.length">
          <button
            type="button"
            class="mt-3 sm:mt-3.5 flex min-h-9 sm:min-h-0 items-center gap-2 py-1 text-fg-muted transition-colors hover:text-fg focus-ring"
            :aria-expanded="showOtherTitles"
            @click="showOtherTitles = !showOtherTitles"
          >
            <span
              class="size-3.5"
              :class="showOtherTitles ? 'i-lucide:chevron-down' : 'i-lucide:chevron-right'"
              aria-hidden="true"
            />
            other titles
          </button>
          <dl
            v-if="showOtherTitles"
            class="mt-2 grid grid-cols-[5.25rem_minmax(0,1fr)] sm:grid-cols-[6rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4 gap-y-1.5"
          >
            <template v-for="t in altTitles" :key="t.languageCode">
              <dt class="text-fg-subtle uppercase">{{ t.languageCode }}</dt>
              <dd class="text-fg-muted">{{ t.title }}</dd>
            </template>
          </dl>
        </template>
      </section>

      <section v-if="isShow" class="flex flex-col gap-3 min-w-0 lg:(col-span-2 mt-4)">
        <h2 class="font-mono text-[0.8125rem] font-medium text-fg-muted">episodes</h2>
        <EpisodeList
          :seasons="seasons"
          :episodes="seasonEpisodes"
          :load-season="loadSeason"
          :watched-keys="watchedKeys"
          :can-log="canLogEpisodes"
          :saving="saving"
          @log="onLogEpisode"
          @unlog="onUnlogEpisode"
        />
      </section>
    </article>
  </main>
</template>
