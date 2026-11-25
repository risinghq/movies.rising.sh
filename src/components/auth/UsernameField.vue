<script setup lang="ts">
import { computed } from "vue";
import { isValidUsername, USERNAME_RULES } from "@/shared/types/identity";

const model = defineModel<string>({ required: true });

// The plugin lowercases on save; validate the value it will store.
const invalid = computed(
  () => model.value.length > 0 && !isValidUsername(model.value.toLowerCase()),
);
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-xs font-mono text-fg-muted" for="username">username</label>
    <div
      class="flex items-center bg-bg-elevated border border-border rounded-lg px-3 focus-within:border-accent/50 transition-colors"
    >
      <span class="text-sm text-fg-subtle font-mono">/u/</span>
      <input
        id="username"
        v-model="model"
        type="text"
        required
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        :minlength="USERNAME_RULES.min"
        :maxlength="USERNAME_RULES.max"
        :aria-invalid="invalid"
        aria-describedby="username-rules"
        class="flex-1 min-w-0 bg-transparent py-2.5 text-sm text-fg outline-none font-mono lowercase"
      />
    </div>
    <p
      id="username-rules"
      class="text-xs font-mono"
      :class="invalid ? 'text-amber-400' : 'text-fg-subtle'"
    >
      3–20 characters: lowercase letters, numbers, underscore.
    </p>
  </div>
</template>
