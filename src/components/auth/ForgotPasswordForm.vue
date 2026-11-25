<script setup lang="ts">
import { ref } from "vue";
import { auth } from "void/client";
import { useSaveAction } from "@/composables/useSaveAction";

defineEmits<{ back: [] }>();

const email = ref("");
const request = useSaveAction();

function submit() {
  void request.run(() =>
    auth.requestPasswordReset({ email: email.value, redirectTo: "/reset-password" }),
  );
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-base font-mono text-fg">reset your password</h1>
      <p class="text-sm text-fg-muted">We email you a link to choose a new password.</p>
    </div>

    <p v-if="request.saved.value" class="text-sm text-fg font-mono" role="status">
      If an account uses that email, a reset link is on its way. It works for 1 hour.
    </p>

    <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-mono text-fg-muted" for="reset-email">email</label>
        <input
          id="reset-email"
          v-model="email"
          type="email"
          required
          placeholder="you@example.com"
          class="bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors font-mono"
        />
      </div>

      <p v-if="request.error.value" class="text-sm text-red-400 font-mono">
        {{ request.error.value }}
      </p>

      <button
        type="submit"
        class="w-full py-2.5 rounded-lg border border-accent/40 bg-accent/10 text-fg font-mono text-sm hover:bg-accent/15 transition-colors disabled:opacity-40"
        :disabled="request.saving.value"
      >
        {{ request.saving.value ? "..." : "request reset link" }}
      </button>
    </form>

    <button
      type="button"
      class="self-center text-xs font-mono text-fg-muted hover:text-fg transition-colors"
      @click="$emit('back')"
    >
      back to sign in
    </button>
  </div>
</template>
