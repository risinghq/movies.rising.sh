<script setup lang="ts">
import type { Props } from "./preferences.server";
import AppearanceSection from "@/components/settings/AppearanceSection.vue";
import PreferencesSection from "@/components/settings/PreferencesSection.vue";
import SettingsShell from "@/components/settings/SettingsShell.vue";

const props = defineProps<Props>();
</script>

<template>
  <SettingsShell page="preferences">
    <PreferencesSection v-bind="props" />
    <AppearanceSection />
  </SettingsShell>
</template>
