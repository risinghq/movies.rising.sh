<script setup lang="ts">
import { auth } from "@/auth-client";
import { useRouter } from "@void/vue";
import { useSaveAction } from "@/composables/useSaveAction";
import { withPasskeyMessage } from "@/shared/passkey-errors";

const router = useRouter();
const signIn = useSaveAction();

async function submit() {
  if (await signIn.run(async () => withPasskeyMessage(await auth.signIn.passkey())))
    await router.visit("/");
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <button
      type="button"
      class="w-full py-2.5 rounded-lg border border-border bg-bg-elevated text-fg-muted font-mono text-sm hover:text-fg hover:border-border-hover transition-colors disabled:opacity-40"
      :disabled="signIn.saving.value"
      @click="submit"
    >
      {{ signIn.saving.value ? "..." : "sign in with a passkey" }}
    </button>
    <p v-if="signIn.error.value" class="text-sm text-red-400 font-mono">
      {{ signIn.error.value }}
    </p>
  </div>
</template>
