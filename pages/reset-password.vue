<script setup lang="ts">
import { ref } from "vue";
import { auth } from "void/client";
import { useRouter } from "@void/vue";
import type { Props } from "./reset-password.server";
import { useSaveAction } from "@/composables/useSaveAction";

const props = defineProps<Props>();
const router = useRouter();
const newPassword = ref("");
const save = useSaveAction();
const usable = Boolean(props.token) && !props.linkError;

async function submit() {
  const ok = await save.run(() =>
    auth.resetPassword({ newPassword: newPassword.value, token: props.token }),
  );
  if (ok) await router.visit("/login");
}
</script>

<template>
  <main class="container flex items-center justify-center min-h-[60vh] py-8 sm:py-12">
    <div class="w-full max-w-sm flex flex-col gap-6">
      <h1 class="text-base font-mono text-fg">choose a new password</h1>

      <div v-if="!usable" class="flex flex-col gap-3">
        <p class="text-sm text-red-400 font-mono">
          This reset link is invalid or has expired. Request a new one from the sign-in page.
        </p>
        <a href="/login" class="text-xs font-mono text-fg-muted hover:text-fg transition-colors">
          back to sign in
        </a>
      </div>

      <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-mono text-fg-muted" for="new-password">new password</label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            placeholder="••••••••"
            class="bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors font-mono"
          />
        </div>

        <p v-if="save.error.value" class="text-sm text-red-400 font-mono">
          {{ save.error.value }}
        </p>

        <button
          type="submit"
          class="w-full py-2.5 rounded-lg border border-accent/40 bg-accent/10 text-fg font-mono text-sm hover:bg-accent/15 transition-colors disabled:opacity-40"
          :disabled="save.saving.value"
        >
          {{ save.saving.value ? "..." : "set password" }}
        </button>
      </form>
    </div>
  </main>
</template>
