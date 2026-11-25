<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Props } from "./index.server";
import { useTracking } from "@/composables/useTracking";
import { useToast } from "@/composables/useToast";
import { useHydrationPoll } from "@/composables/useHydrationPoll";
import EpisodeList from "@/components/media/EpisodeList.vue";
import FavoriteButton from "@/components/media/FavoriteButton.vue";
import MediaHeader from "@/components/media/MediaHeader.vue";
import TitleStats from "@/components/media/TitleStats.vue";
import { LIBRARY_STATUSES, statusBadge } from "@/shared/library-status";
import { airedText, episodeSummary } from "@/shared/format-media";
import type { EpisodeRecord, SeasonEpisodes, SeasonSummary } from "@/domain/catalog/episodes";
import type { ShowViewDto } from "@/shared/tracking";

const props = defineProps<Props>();
const toast = useToast();

const seasons = ref<SeasonSummary[]>(props.seasons);
// Episodes are public catalog data, so a loaded season stays loaded across
// show-view refreshes, which update only the watched marks and counts.
const seasonEpisodes = ref(new Map<number, EpisodeRecord[]>());
storeSeason(props.firstSeason);
const seasonCount = ref(props.media.seasonCount);
const episodeTotal = ref(props.media.episodeCount);
const episodeHydrationError = ref(props.media.episodesError);

const watchedKeys = ref<string[]>([...props.watchedEpisodeKeys]);
const canLogEpisodes = computed(() => !!props.user);

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
  storeSeason(view.firstSeason);
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
  () =>
    props.media.mediaType === "show" && seasons.value.length === 0 && !episodeHydrationError.value,
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
  progressText,
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

const networks = computed(() =>
  props.companies.filter((c) => c.kind === "network").map((c) => c.name),
);
const studios = computed(() =>
  props.companies.filter((c) => c.kind === "company").map((c) => c.name),
);
const language = computed(() => props.media.originalLanguage?.toUpperCase() ?? null);
const seasonsText = computed(() =>
  props.media.mediaType === "show" ? episodeSummary(seasonCount.value, episodeTotal.value) : null,
);
const aired = computed(() =>
  airedText(props.media.releaseDate, props.media.lastAirDate, props.media.mediaType === "show"),
);
const showOtherTitles = ref(false);

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
  <main class="flex-1 pb-8">
    <MediaHeader :media="liveMedia" page="overview">
      <template #actions>
        <FavoriteButton :media-id="media.id" :initial="isFavorited" :logged-in="!!user" />
        <span
          v-if="entry"
          class="inline-flex items-center gap-1 rounded-md border border-border bg-transparent px-2.5 py-1.5 font-mono text-sm text-fg-muted"
          title="in your library"
          aria-label="in your library"
        >
          <span class="i-lucide:library size-[1em]" aria-hidden="true" />
          <span class="max-sm:sr-only">library</span>
        </span>
      </template>
    </MediaHeader>

    <article class="container w-full flex flex-col gap-10 py-6 sm:py-8 lg:py-12">
      <section class="flex flex-col gap-5 motion-safe:animate-slide-up animate-fill-both">
        <div v-if="genres.length" class="flex flex-wrap gap-1.5">
          <span
            v-for="g in genres"
            :key="g.name"
            class="px-2 py-0.5 rounded-full border border-border bg-bg-subtle text-xs text-fg-muted"
          >
            {{ g.name }}
          </span>
        </div>

        <!-- Setting status, rating, or watch progress registers the title in the library. -->
        <div v-if="user" class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label class="flex flex-col gap-1 w-full sm:w-auto">
            <span class="text-xs font-mono text-fg-subtle">status</span>
            <select
              :value="displayStatus ?? ''"
              :disabled="saving"
              class="w-full sm:w-auto rounded-lg border text-sm font-mono px-3 py-2 outline-none transition-colors disabled:opacity-60 cursor-pointer"
              :class="
                displayStatus
                  ? [statusBadge(displayStatus), 'border']
                  : 'border-border bg-bg-subtle text-fg-muted'
              "
              aria-label="library status"
              @change="onStatusChange"
            >
              <option value="" disabled>not tracking</option>
              <option v-for="status in LIBRARY_STATUSES" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs font-mono text-fg-subtle">rating</span>
            <div class="flex items-center gap-1.5">
              <input
                type="number"
                :min="0"
                :max="scoreMax"
                :value="displayScore ?? ''"
                placeholder="0"
                :disabled="saving"
                class="w-16 bg-bg-subtle border border-border rounded-lg px-2.5 py-2 text-sm font-mono text-fg placeholder:text-fg-subtle outline-none focus:border-accent transition-colors disabled:opacity-60"
                aria-label="your rating"
                @change="onScoreChange"
              />
              <span class="text-xs font-mono text-fg-subtle">/ {{ scoreMax }}</span>
            </div>
          </label>

          <div class="flex flex-col gap-1 w-full sm:w-auto">
            <span class="text-xs font-mono text-fg-subtle">
              {{ media.mediaType === "movie" ? "watch" : (progressText ?? "episodes") }}
            </span>
            <button
              type="button"
              class="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-fg px-4 py-2 text-sm font-mono text-bg transition-colors hover:bg-fg/50 disabled:opacity-60 focus-ring"
              :disabled="saving || (media.mediaType === 'show' && !canLogEpisode)"
              :title="
                media.mediaType === 'show' && !canLogEpisode
                  ? 'every episode is already logged'
                  : undefined
              "
              @click="media.mediaType === 'movie' ? logWatch() : onQuickLogEpisode()"
            >
              <span
                :class="media.mediaType === 'movie' ? 'i-lucide:check' : 'i-lucide:plus'"
                class="w-4 h-4"
                aria-hidden="true"
              />
              {{ saving ? "..." : media.mediaType === "movie" ? "log watch" : "+1 episode" }}
            </button>
          </div>

          <button
            v-if="entry"
            type="button"
            class="self-start sm:self-end inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-mono transition-colors disabled:opacity-60 focus-ring"
            :class="
              confirmRemove
                ? 'border-red-400/40 bg-red-400/10 text-red-400'
                : 'border-border bg-bg-subtle text-fg-subtle hover:text-fg hover:border-border-hover'
            "
            :disabled="saving"
            @click="onRemoveClick"
          >
            <span class="i-lucide:trash-2 w-4 h-4" aria-hidden="true" />
            {{ confirmRemove ? "confirm?" : "remove" }}
          </button>
        </div>

        <a
          v-else
          href="/login"
          class="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-bg-subtle text-sm font-mono text-fg-muted hover:text-fg hover:border-border-hover transition-colors focus-ring"
        >
          <span class="i-lucide:log-in w-4 h-4" aria-hidden="true" />
          sign in to track
        </a>
      </section>

      <section class="flex flex-col gap-4">
        <h2 class="text-sm font-mono text-fg-muted">details</h2>
        <dl
          class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm font-mono items-baseline"
        >
          <template v-if="seasonsText">
            <dt class="text-fg-subtle">episodes</dt>
            <dd class="text-fg">{{ seasonsText }}</dd>
          </template>
          <template v-if="networks.length">
            <dt class="text-fg-subtle">network</dt>
            <dd class="text-fg">{{ networks.join(" · ") }}</dd>
          </template>
          <template v-if="studios.length">
            <dt class="text-fg-subtle">studios</dt>
            <dd class="text-fg">{{ studios.join(" · ") }}</dd>
          </template>
          <template v-if="language">
            <dt class="text-fg-subtle">language</dt>
            <dd class="text-fg">{{ language }}</dd>
          </template>
          <template v-if="aired">
            <dt class="text-fg-subtle">aired</dt>
            <dd class="text-fg">{{ aired }}</dd>
          </template>
          <template v-if="media.certification">
            <dt class="text-fg-subtle">rating</dt>
            <dd class="text-fg">{{ media.certification }}</dd>
          </template>
        </dl>

        <div v-if="altTitles.length" class="text-sm font-mono">
          <button
            type="button"
            class="flex items-center gap-1.5 text-fg-subtle hover:text-fg transition-colors"
            @click="showOtherTitles = !showOtherTitles"
          >
            <span
              class="w-3.5 h-3.5"
              :class="showOtherTitles ? 'i-lucide:chevron-down' : 'i-lucide:chevron-right'"
              aria-hidden="true"
            />
            other titles
          </button>
          <dl
            v-if="showOtherTitles"
            class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 mt-2 pl-5"
          >
            <template v-for="t in altTitles" :key="t.languageCode">
              <dt class="text-fg-subtle uppercase">{{ t.languageCode }}</dt>
              <dd class="text-fg-muted">{{ t.title }}</dd>
            </template>
          </dl>
        </div>
      </section>

      <section v-if="media.mediaType === 'show'" class="flex flex-col gap-4">
        <h2 class="text-sm font-mono text-fg-muted">episodes</h2>
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

      <TitleStats :stats="stats" />
    </article>
  </main>
</template>
