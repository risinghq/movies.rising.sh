<script setup lang="ts">
import { nextTick, ref } from "vue";
import { Link } from "@void/vue";
import LogoMark from "@/components/brand/LogoMark.vue";
import HeaderAccountMenu from "@/components/HeaderAccountMenu.vue";
import HeaderMobileMenu from "@/components/HeaderMobileMenu.vue";
import HeaderSearchBox from "@/components/HeaderSearchBox.vue";

const props = defineProps<{
  user: { id: string; name: string; email: string; username?: string | null } | null;
}>();

const emit = defineEmits<{
  openPalette: [];
}>();

const searchBoxRef = ref<InstanceType<typeof HeaderSearchBox> | null>(null);
const logoRef = ref<InstanceType<typeof LogoMark> | null>(null);
const showMobileMenu = ref(false);
const searchExpanded = ref(false);

function openPalette() {
  emit("openPalette");
}

function expandMobileSearch() {
  searchExpanded.value = true;
  nextTick(() => searchBoxRef.value?.focus());
}

function collapseMobileSearch() {
  searchExpanded.value = false;
}

function handleSearchBlur() {
  window.setTimeout(collapseMobileSearch, 150);
}
</script>

<template>
  <header class="relative z-50 border-b border-border">
    <div class="absolute inset-0 bg-bg/80 backdrop-blur-md" />
    <nav
      class="relative container min-h-14 z-1 flex items-center gap-1 sm:(grid grid-cols-[auto_minmax(0,360px)_1fr] gap-6)"
      aria-label="main navigation"
    >
      <Link
        v-if="!searchExpanded"
        href="/"
        class="justify-self-start inline-flex items-center gap-2 me-auto shrink-0 font-mono text-lg font-medium leading-none tracking-[-0.02em] text-fg rounded focus-ring"
        aria-label="track home"
        @pointerenter="logoRef?.play()"
        @focus="logoRef?.play()"
      >
        <LogoMark ref="logoRef" :size="20" />
        <span>track</span>
      </Link>

      <HeaderSearchBox
        ref="searchBoxRef"
        :class="searchExpanded ? 'flex-1 min-w-0' : 'hidden sm:block'"
        @blur="handleSearchBlur"
      />

      <button
        v-if="searchExpanded"
        type="button"
        class="sm:hidden h-11 px-2.5 text-[15px] text-fg rounded-lg focus-ring"
        @click="collapseMobileSearch"
      >
        cancel
      </button>

      <div v-if="!searchExpanded" class="hidden sm:flex justify-self-end items-center gap-1">
        <HeaderAccountMenu v-if="props.user" :user="props.user" />
        <Link
          v-else
          href="/login"
          class="h-8 inline-flex items-center px-3 rounded-md text-sm text-fg hover:bg-fg/6 transition-colors focus-ring"
        >
          sign in
        </Link>
      </div>

      <template v-if="!searchExpanded">
        <button
          type="button"
          class="sm:hidden size-11 grid place-items-center rounded-lg text-fg hover:bg-fg/6 focus-ring"
          aria-label="search"
          @click="expandMobileSearch"
        >
          <span class="i-lucide:search size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="sm:hidden size-11 grid place-items-center rounded-lg text-fg hover:bg-fg/6 focus-ring"
          aria-label="open menu"
          :aria-expanded="showMobileMenu"
          @click="showMobileMenu = !showMobileMenu"
        >
          <span class="i-lucide:menu size-5" aria-hidden="true" />
        </button>
      </template>
    </nav>

    <HeaderMobileMenu
      v-model:open="showMobileMenu"
      :user="props.user"
      @open-palette="openPalette"
    />
  </header>
</template>
