<script setup lang="ts">
import { Link } from "@void/vue";

type SettingsPage = "account" | "profile" | "preferences";

defineProps<{ page: SettingsPage }>();

const PAGES: { page: SettingsPage; label: string; href: string; icon: string }[] = [
  { page: "account", label: "account", href: "/settings", icon: "i-lucide:key-round" },
  { page: "profile", label: "profile", href: "/settings/profile", icon: "i-lucide:user" },
  {
    page: "preferences",
    label: "preferences",
    href: "/settings/preferences",
    icon: "i-lucide:sliders-horizontal",
  },
];
</script>

<template>
  <main
    class="container flex flex-col gap-6 max-w-4xl py-8 sm:(grid grid-cols-[11rem_minmax(0,1fr)] gap-x-10 gap-y-8 py-12)"
  >
    <h1 class="text-3xl font-mono font-bold sm:col-span-2">settings</h1>

    <nav
      aria-label="settings"
      class="flex gap-1 -mx-1 overflow-x-auto font-mono text-sm sm:(flex-col self-start sticky top-20 mx-0 overflow-visible)"
    >
      <Link
        v-for="link in PAGES"
        :key="link.page"
        :href="link.href"
        :aria-current="page === link.page ? 'page' : undefined"
        class="shrink-0 flex items-center gap-2 rounded-md px-3 py-2 decoration-none transition-colors focus-ring"
        :class="
          page === link.page ? 'bg-bg-muted text-fg' : 'text-fg-muted hover:(text-fg bg-bg-subtle)'
        "
      >
        <span :class="link.icon" class="w-4 h-4 hidden sm:block" aria-hidden="true" />
        {{ link.label }}
      </Link>
      <Link
        href="/import"
        class="shrink-0 flex items-center gap-2 rounded-md px-3 py-2 decoration-none text-fg-muted hover:(text-fg bg-bg-subtle) transition-colors focus-ring"
      >
        <span class="i-lucide:download w-4 h-4 hidden sm:block" aria-hidden="true" />
        import
      </Link>
    </nav>

    <div class="flex flex-col gap-8 min-w-0">
      <slot />
    </div>
  </main>
</template>
