<script setup lang="ts">
import type { ProfileCardModel } from "@/domain/profile-card";
import ProfileHeader from "@/components/identity/ProfileHeader.vue";
import ProfileSection from "@/components/identity/ProfileSection.vue";
import ProfileStatStrip from "./ProfileStatStrip.vue";
import ProfileFavorites from "./ProfileFavorites.vue";
import ProfileActivityHeatmap from "./ProfileActivityHeatmap.vue";
import ProfileActivityFeed from "./ProfileActivityFeed.vue";

const props = defineProps<{ card: ProfileCardModel; owner: boolean }>();
</script>

<template>
  <div class="flex flex-col gap-10">
    <ProfileHeader :identity="props.card.identity">
      <template #meta>
        <ProfileStatStrip :stats="props.card.stats" :average-score="props.card.averageScore" />
      </template>
      <template #aside>
        <slot name="header-aside" />
      </template>
    </ProfileHeader>

    <ProfileFavorites :favorites="props.card.favorites" :owner="props.owner" />

    <ProfileSection title="activity">
      <template #aside>
        <span class="text-[0.7rem] font-mono text-fg-subtle">last 365 days</span>
      </template>
      <ProfileActivityHeatmap :days="props.card.activity.calendar" />
    </ProfileSection>

    <ProfileSection title="recent activity">
      <ProfileActivityFeed :items="props.card.activity.recent" />
    </ProfileSection>
  </div>
</template>
