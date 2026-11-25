<script setup lang="ts">
import MediaResultRow from "@/components/media/MediaResultRow.vue";
import PersonResultRow from "@/components/PersonResultRow.vue";
import type { LocalResult, PersonResult, RemoteResult } from "@/composables/useMediaSearch";

/** Rows in palette navigation order: catalog hits, people, then TMDB titles.
 * Indexes match the palette's navItems. */
const props = defineProps<{
  local: LocalResult[];
  people: PersonResult[];
  remote: RemoteResult[];
  activeIndex: number;
}>();

defineEmits<{ hover: [index: number]; pick: [] }>();

const peopleStart = () => props.local.length;
const remoteStart = () => props.local.length + props.people.length;
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <MediaResultRow
      v-for="(item, index) in local"
      :key="`local:${item.id}`"
      :title="item.title"
      :media-type="item.mediaType"
      :poster-path="item.posterPath"
      :release-date="item.releaseDate"
      :slug="item.slug"
      :media="item.id"
      :tracked="item.inLibrary"
      :active="activeIndex === index"
      @mouseenter="$emit('hover', index)"
    />
    <PersonResultRow
      v-for="(person, index) in people"
      :key="`person:${person.tmdbId}`"
      :name="person.name"
      :slug="person.slug"
      :profile-path="person.profilePath"
      :known-for-department="person.knownForDepartment"
      :known-for="person.knownFor"
      :active="activeIndex === peopleStart() + index"
      @mouseenter="$emit('hover', peopleStart() + index)"
      @click="$emit('pick')"
    />
    <MediaResultRow
      v-for="(item, index) in remote"
      :key="`remote:${item.mediaType}:${item.tmdbId}`"
      :title="item.title"
      :media-type="item.mediaType"
      :poster-path="item.posterPath"
      :release-date="item.releaseDate"
      :slug="item.slug"
      :media="item"
      :tracked="item.inLibrary"
      :active="activeIndex === remoteStart() + index"
      @mouseenter="$emit('hover', remoteStart() + index)"
    />
  </div>
</template>
