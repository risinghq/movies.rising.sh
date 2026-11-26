<script setup lang="ts">
import type { Props } from "./index.server";
import AccountSection from "@/components/settings/AccountSection.vue";
import PasskeysSection from "@/components/settings/PasskeysSection.vue";
import SettingsShell from "@/components/settings/SettingsShell.vue";

const props = defineProps<Props>();
</script>

<template>
  <SettingsShell page="account">
    <AccountSection v-bind="props.account" />
    <PasskeysSection />
    <p v-if="props.isAdmin" class="text-xs font-mono text-fg-subtle">role: admin</p>
  </SettingsShell>
</template>
