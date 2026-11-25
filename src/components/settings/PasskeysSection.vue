<script setup lang="ts">
import { onMounted, ref } from "vue";
import { auth } from "@/auth-client";
import SettingsSection from "./SettingsSection.vue";
import { useSaveAction } from "@/composables/useSaveAction";
import { withPasskeyMessage } from "@/shared/passkey-errors";

type Passkey = { id: string; name?: string | null; createdAt?: Date | string | null };

const passkeys = ref<Passkey[]>([]);
const loadError = ref("");
const change = useSaveAction();

async function load() {
  const { data, error } = await auth.passkey.listUserPasskeys();
  loadError.value = error ? (error.message ?? "could not load passkeys") : "";
  passkeys.value = data ?? [];
}

function added(passkey: Passkey) {
  return passkey.createdAt ? `added ${new Date(passkey.createdAt).toLocaleDateString()}` : "";
}

async function add() {
  if (await change.run(async () => withPasskeyMessage(await auth.passkey.addPasskey())))
    await load();
}

async function remove(id: string) {
  if (await change.run(() => auth.passkey.deletePasskey({ id }))) await load();
}

onMounted(load);
</script>

<template>
  <SettingsSection title="passkeys" hint="sign in with your device instead of a password">
    <div v-for="passkey in passkeys" :key="passkey.id" class="flex items-center gap-4 px-4 py-3">
      <div class="flex-1 min-w-0">
        <span class="text-sm font-mono text-fg">{{ passkey.name || "passkey" }}</span>
        <p class="text-xs text-fg-subtle mt-0.5">{{ added(passkey) }}</p>
      </div>
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-fg-muted text-xs font-mono hover:text-fg hover:border-border-hover transition-colors disabled:opacity-40"
        :disabled="change.saving.value"
        @click="remove(passkey.id)"
      >
        remove
      </button>
    </div>

    <div class="flex flex-col gap-2 px-4 py-3">
      <button
        type="button"
        class="self-start px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-fg-muted text-xs font-mono hover:text-fg hover:border-border-hover transition-colors disabled:opacity-40"
        :disabled="change.saving.value"
        @click="add"
      >
        {{ change.saving.value ? "..." : "add a passkey" }}
      </button>
      <p v-if="change.error.value || loadError" class="text-xs text-red-400 font-mono">
        {{ change.error.value || loadError }}
      </p>
    </div>
  </SettingsSection>
</template>
