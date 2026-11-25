<script setup lang="ts">
import type { Props } from "./settings.server";
import AccountSection from "@/components/settings/AccountSection.vue";
import ProfileSection from "@/components/settings/ProfileSection.vue";
import PreferencesSection from "@/components/settings/PreferencesSection.vue";
import SettingsSection from "@/components/settings/SettingsSection.vue";
import { useColorTheme } from "@/composables/useColorTheme";
import { Link } from "@void/vue";

const props = defineProps<Props>();
const { theme, toggle } = useColorTheme();
</script>

<template>
  <main class="container flex flex-col gap-8 max-w-2xl py-8 sm:py-12">
    <div>
      <h1 class="text-3xl font-mono font-bold">settings</h1>
      <p class="text-fg-muted text-sm mt-1">account and preferences</p>
    </div>

    <AccountSection
      :username="props.profile.username"
      :display-name="props.profile.displayName"
      :email="props.profile.email"
    />

    <ProfileSection
      :username="props.profile.username"
      :display-name="props.profile.displayName"
      :emoji="props.profile.avatarEmoji"
      :color="props.profile.avatarColor"
      :visibility="props.profile.visibility"
    />

    <PreferencesSection
      :rating-system="props.profile.ratingSystem"
      :time-zone="props.profile.timeZone"
    />

    <SettingsSection title="import">
      <Link
        href="/import"
        class="flex items-center justify-between px-4 py-3 hover:bg-bg-muted transition-colors"
      >
        <div>
          <span class="text-sm font-mono text-fg-muted">bring your history</span>
          <p class="text-xs text-fg-subtle mt-0.5">from Trakt or TMDB, and undo past imports</p>
        </div>
        <span class="i-lucide:chevron-right w-4 h-4 text-fg-subtle" aria-hidden="true" />
      </Link>
    </SettingsSection>

    <SettingsSection title="appearance">
      <div class="flex items-center justify-between px-4 py-3">
        <div>
          <span class="text-sm font-mono text-fg-muted">color theme</span>
          <p class="text-xs text-fg-subtle mt-0.5">
            {{ theme === "dark" ? "dark" : "light" }} mode
          </p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-fg-muted text-sm hover:border-border-hover hover:text-fg transition-colors"
          :aria-label="`switch to ${theme === 'dark' ? 'light' : 'dark'} mode`"
          @click="toggle"
        >
          <span
            :class="theme === 'dark' ? 'i-lucide:sun' : 'i-lucide:moon'"
            class="w-4 h-4"
            aria-hidden="true"
          />
          <span class="font-mono text-xs">{{ theme === "dark" ? "light" : "dark" }}</span>
        </button>
      </div>
    </SettingsSection>

    <p v-if="props.profile.role === 'admin'" class="text-xs font-mono text-fg-subtle">
      role: admin
    </p>
  </main>
</template>
