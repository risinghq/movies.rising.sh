<script setup lang="ts">
import SettingsSection from "./SettingsSection.vue";
import { useColorTheme } from "@/composables/useColorTheme";
import { THEME_PREFERENCES } from "@/shared/theme";

const { preference } = useColorTheme();
</script>

<template>
  <SettingsSection title="appearance">
    <div class="flex items-center justify-between px-4 py-3 gap-4">
      <div>
        <span class="text-sm font-mono text-fg-muted">color theme</span>
        <p class="text-xs text-fg-subtle mt-0.5">system follows your device</p>
      </div>
      <div
        class="flex rounded-lg border border-border overflow-hidden shrink-0"
        role="group"
        aria-label="color theme"
      >
        <button
          v-for="option in THEME_PREFERENCES"
          :key="option"
          type="button"
          class="px-3 py-1.5 text-xs font-mono transition-colors"
          :class="
            preference === option
              ? 'bg-accent/15 text-accent'
              : 'bg-bg-subtle text-fg-muted hover:bg-bg-elevated hover:text-fg'
          "
          :aria-pressed="preference === option"
          @click="preference = option"
        >
          {{ option }}
        </button>
      </div>
    </div>
  </SettingsSection>
</template>
