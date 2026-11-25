<script setup lang="ts">
import { ref } from "vue";
import { auth } from "void/client";
import { useRouter } from "@void/vue";

const router = useRouter();
const email = ref("");
const password = ref("");
const name = ref("");
const mode = ref<"signin" | "signup" | "forgot">("signin");
const error = ref("");
const loading = ref(false);
const resetRequested = ref(false);

// Better Auth client calls resolve to `{ data, error }` and may also throw.
async function unwrap(call: Promise<{ error?: { message?: string } | null }>) {
  const result = await call;
  if (result?.error) throw new Error(result.error.message ?? "authentication failed");
}

async function authenticate() {
  if (mode.value === "signup") {
    // `timeZone` is an input additional field, so set it during account creation.
    await unwrap(
      auth.signUp.email({
        email: email.value,
        password: password.value,
        name: name.value || email.value.split("@")[0],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    );
  } else {
    await unwrap(auth.signIn.email({ email: email.value, password: password.value }));
  }
  await router.visit("/");
}

async function requestReset() {
  await unwrap(auth.requestPasswordReset({ email: email.value, redirectTo: "/reset-password" }));
  resetRequested.value = true;
}

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await (mode.value === "forgot" ? requestReset() : authenticate());
  } catch (err) {
    error.value = err instanceof Error ? err.message : "authentication failed";
  } finally {
    loading.value = false;
  }
}

function setMode(next: typeof mode.value) {
  mode.value = next;
  error.value = "";
  resetRequested.value = false;
}
</script>

<template>
  <main class="container flex items-center justify-center min-h-[60vh] py-8 sm:py-12">
    <div class="w-full max-w-sm flex flex-col gap-6">
      <div
        v-if="mode !== 'forgot'"
        class="flex p-1 rounded-xl bg-bg-subtle border border-border gap-1"
      >
        <button
          type="button"
          class="flex-1 py-2 rounded-lg text-sm font-mono transition-all duration-150"
          :class="
            mode === 'signin' ? 'bg-bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
          "
          @click="setMode('signin')"
        >
          sign in
        </button>
        <button
          type="button"
          class="flex-1 py-2 rounded-lg text-sm font-mono transition-all duration-150"
          :class="
            mode === 'signup' ? 'bg-bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
          "
          @click="setMode('signup')"
        >
          sign up
        </button>
      </div>
      <div v-else class="flex flex-col gap-1">
        <h1 class="text-base font-mono text-fg">reset your password</h1>
        <p class="text-sm text-fg-muted">
          The site sends no email. Ask the site owner for your reset link after you submit.
        </p>
      </div>

      <p v-if="resetRequested" class="text-sm text-fg font-mono" role="status">
        Request saved. Ask the site owner for your reset link. It works for 24 hours.
      </p>

      <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
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

          <div v-if="mode !== 'forgot'" class="flex flex-col gap-1.5">
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
          {{
            loading
              ? "..."
              : mode === "signin"
                ? "sign in"
                : mode === "signup"
                  ? "create account"
                  : "request reset link"
          }}
        </button>
      </form>

      <button
        v-if="mode === 'signin'"
        type="button"
        class="self-center text-xs font-mono text-fg-muted hover:text-fg transition-colors"
        @click="setMode('forgot')"
      >
        forgot password?
      </button>
      <button
        v-else-if="mode === 'forgot'"
        type="button"
        class="self-center text-xs font-mono text-fg-muted hover:text-fg transition-colors"
        @click="setMode('signin')"
      >
        back to sign in
      </button>
    </div>
  </main>
</template>
