<script setup lang="ts">
import type { Props } from "./profile.server";
import ProfileSection from "@/components/settings/ProfileSection.vue";
import SettingsShell from "@/components/settings/SettingsShell.vue";

const props = defineProps<Props>();
</script>

<template>
  <SettingsShell page="profile">
    <ProfileSection v-bind="props" />
  </SettingsShell>
</template>
