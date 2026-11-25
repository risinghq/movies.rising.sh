<script setup lang="ts">
import { ref } from "vue";
import { Link, useRouter } from "@void/vue";
import { auth } from "void/client";
import Avatar from "@/components/identity/Avatar.vue";

const props = defineProps<{
  user: { name: string; username?: string | null };
}>();

const router = useRouter();
const open = ref(false);

async function signOut() {
  await auth.signOut();
  open.value = false;
  await router.visit("/login");
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="size-9 grid place-items-center rounded-full hover:bg-fg/6 transition-colors focus-ring"
      aria-label="account menu"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="open = !open"
    >
      <Avatar :emoji="null" :color="null" :name="props.user.name" :size="28" />
    </button>

    <div v-if="open" class="fixed inset-0 z-40" @click="open = false" />
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="open"
        class="absolute right-0 top-11.5 z-50 w-54 flex flex-col p-1 rounded-[10px] border border-border bg-bg-subtle shadow-[0_12px_32px_oklch(0_0_0/0.4)] text-sm"
        role="menu"
      >
        <div class="flex flex-col gap-0.75 px-2.5 pt-2.5 pb-2">
          <span class="text-fg truncate">{{ props.user.name }}</span>
          <span v-if="props.user.username" class="font-mono text-xs text-fg-muted truncate">
            @{{ props.user.username }}
          </span>
        </div>
        <div class="h-px bg-border my-1" />
        <Link
          v-if="props.user.username"
          :href="`/u/${props.user.username}`"
          class="menu-item text-fg"
          role="menuitem"
          @click="open = false"
        >
          profile
        </Link>
        <Link href="/settings" class="menu-item text-fg" role="menuitem" @click="open = false">
          settings
        </Link>
        <div class="h-px bg-border my-1" />
        <button
          type="button"
          class="menu-item text-left text-fg-muted"
          role="menuitem"
          @click="signOut"
        >
          sign out
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.menu-item {
  height: 2rem;
  display: flex;
  align-items: center;
  padding: 0 0.625rem;
  border-radius: 0.375rem;
  transition: background-color 150ms;
}
.menu-item:hover,
.menu-item:focus-visible {
  background: color-mix(in oklch, var(--fg) 6%, transparent);
}
</style>
