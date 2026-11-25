<script setup lang="ts">
import { computed } from "vue";
import ProfileSection from "@/components/identity/ProfileSection.vue";
import FavoritesRow from "./FavoritesRow.vue";
import FavoriteTitleTile from "./FavoriteTitleTile.vue";
import FavoritePersonTile from "./FavoritePersonTile.vue";
import type { ProfileCardModel } from "@/domain/profile-card";

const props = defineProps<{ favorites: ProfileCardModel["favorites"]; owner: boolean }>();

const titles = computed(() =>
  props.favorites.media.map((fav) => ({ key: fav.mediaId, ...fav.media })),
);
const people = computed(() =>
  props.favorites.people.map((person) => ({ key: person.personId, ...person })),
);
// A visitor sees only rows that have items; the owner also sees a hint per empty row.
const showTitles = computed(() => titles.value.length > 0 || props.owner);
const showPeople = computed(() => people.value.length > 0 || props.owner);
</script>

<template>
  <ProfileSection v-if="showTitles || showPeople" title="favorites">
    <div class="flex flex-col gap-6">
      <template v-if="showTitles">
        <FavoritesRow v-if="titles.length > 0" v-slot="{ item }" label="titles" :items="titles">
          <FavoriteTitleTile :title="item.title" :slug="item.slug" :poster-path="item.posterPath" />
        </FavoritesRow>
        <p v-else class="favorite-hint">
          no titles yet. tap the heart on a movie's or show's page to add it here.
        </p>
      </template>
      <template v-if="showPeople">
        <FavoritesRow v-if="people.length > 0" v-slot="{ item }" label="people" :items="people">
          <FavoritePersonTile
            :name="item.name"
            :slug="item.slug"
            :profile-path="item.profilePath"
          />
        </FavoritesRow>
        <p v-else class="favorite-hint">
          no people yet. tap the heart on a director, actor, writer or composer's page to add them
          here.
        </p>
      </template>
    </div>
  </ProfileSection>
</template>
