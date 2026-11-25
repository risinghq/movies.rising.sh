<script setup lang="ts">
import { computed, ref } from "vue";
import { auth } from "void/client";
import { useRouter } from "@void/vue";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm.vue";
import PasskeySignIn from "@/components/auth/PasskeySignIn.vue";

const router = useRouter();
const email = ref("");
const password = ref("");
const name = ref("");
const mode = ref<"signin" | "signup" | "forgot">("signin");
const error = ref("");
const loading = ref(false);
const submitLabel = computed(() => {
  if (loading.value) return "...";
  return mode.value === "signup" ? "create account" : "sign in";
});

// Better Auth client calls resolve to `{ data, error }` and may also throw.
async function unwrap(call: Promise<{ error?: { message?: string } | null }>) {
  const result = await call;
  if (result?.error) throw new Error(result.error.message ?? "authentication failed");
}

function authenticate() {
  if (mode.value !== "signup") {
    return auth.signIn.email({ email: email.value, password: password.value });
  }
  // `timeZone` is an input additional field, so set it during account creation.
  return auth.signUp.email({
    email: email.value,
    password: password.value,
    name: name.value || email.value.split("@")[0],
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await unwrap(authenticate());
    await router.visit("/");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "authentication failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="container flex items-center justify-center min-h-[60vh] py-8 sm:py-12">
    <ForgotPasswordForm v-if="mode === 'forgot'" class="w-full max-w-sm" @back="mode = 'signin'" />

    <div v-else class="w-full max-w-sm flex flex-col gap-6">
      <div class="flex p-1 rounded-xl bg-bg-subtle border border-border gap-1">
        <button
          type="button"
          class="flex-1 py-2 rounded-lg text-sm font-mono transition-all duration-150"
          :class="
            mode === 'signin' ? 'bg-bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
          "
          @click="mode = 'signin'"
        >
          sign in
        </button>
        <button
          type="button"
          class="flex-1 py-2 rounded-lg text-sm font-mono transition-all duration-150"
          :class="
            mode === 'signup' ? 'bg-bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
          "
          @click="mode = 'signup'"
        >
          sign up
        </button>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-3">
          <div v-if="mode === 'signup'" class="flex flex-col gap-1.5">
            <label class="text-xs font-mono text-fg-muted" for="name">name</label>
            <input
              id="name"
              v-model="name"
              type="text"
              placeholder="your name"
              class="bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors font-mono"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-mono text-fg-muted" for="email">email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              placeholder="you@example.com"
              class="bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors font-mono"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-mono text-fg-muted" for="password">password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              minlength="8"
              placeholder="••••••••"
              class="bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors font-mono"
            />
          </div>
        </div>

        <p v-if="error" class="text-sm text-red-400 font-mono">{{ error }}</p>

        <button
          type="submit"
          class="w-full py-2.5 rounded-lg border border-accent/40 bg-accent/10 text-fg font-mono text-sm hover:bg-accent/15 transition-colors disabled:opacity-40"
          :disabled="loading"
        >
          {{ submitLabel }}
        </button>
      </form>

      <template v-if="mode === 'signin'">
        <PasskeySignIn />
        <button
          type="button"
          class="self-center text-xs font-mono text-fg-muted hover:text-fg transition-colors"
          @click="mode = 'forgot'"
        >
          forgot password?
        </button>
      </template>
    </div>
  </main>
</template>
