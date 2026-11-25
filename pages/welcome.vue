<script setup lang="ts">
import { ref } from "vue";
import { auth } from "void/client";
import { useRouter } from "@void/vue";
import type { Props } from "./welcome.server";
import UsernameField from "@/components/auth/UsernameField.vue";
import { useSaveAction } from "@/composables/useSaveAction";
import { isValidUsername } from "@/shared/types/identity";

const props = defineProps<Props>();
const router = useRouter();
const username = ref(props.suggestion);
const save = useSaveAction();

async function submit() {
  const handle = username.value.toLowerCase();
  if (!isValidUsername(handle)) return;
  const ok = await save.run(() => auth.updateUser({ username: handle }));
  if (ok) await router.visit(props.next);
}
</script>

<template>
  <main class="container flex items-center justify-center min-h-[60vh] py-8 sm:py-12">
    <form class="w-full max-w-sm flex flex-col gap-6" @submit.prevent="submit">
      <div class="flex flex-col gap-2">
        <h1 class="text-lg font-mono text-fg">choose a username</h1>
        <p class="text-sm text-fg-muted">
          Your profile lives at its address. A private profile is still yours to see.
        </p>
      </div>

      <UsernameField v-model="username" />

      <p v-if="save.error.value" class="text-sm text-red-400 font-mono">{{ save.error.value }}</p>

      <button
        type="submit"
        class="w-full py-2.5 rounded-lg border border-accent/40 bg-accent/10 text-fg font-mono text-sm hover:bg-accent/15 transition-colors disabled:opacity-40"
        :disabled="save.saving.value || !isValidUsername(username.toLowerCase())"
      >
        {{ save.saving.value ? "..." : "continue" }}
      </button>
    </form>
  </main>
</template>
