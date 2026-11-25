<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "@void/vue";
import Input from "@/components/ui/Input.vue";

const emit = defineEmits<{
  focus: [];
  blur: [];
}>();

const router = useRouter();
const query = ref("");
const inputRef = ref<InstanceType<typeof Input> | null>(null);
const hasQuery = computed(() => query.value.trim().length > 0);
// The server cannot know the platform, so it renders ⌘ and the client corrects it.
const modKey = ref("⌘");

onMounted(() => {
  if (!/mac|iphone|ipad/i.test(navigator.platform)) modKey.value = "ctrl ";
});

function handleSubmit() {
  const q = query.value.trim();
  void router.visit(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
}

function clearSearch() {
  query.value = "";
  inputRef.value?.focus();
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
});
</script>

<template>
  <div role="search">
    <form method="GET" action="/search" @submit.prevent="handleSubmit">
      <label for="header-search" class="sr-only">search titles</label>

      <div class="search-box group relative flex items-center">
        <span
          class="i-lucide:search absolute inset-is-3 size-4 text-fg-subtle pointer-events-none group-focus-within:text-accent transition-colors"
          aria-hidden="true"
        />

        <Input
          id="header-search"
          ref="inputRef"
          v-model="query"
          type="search"
          name="q"
          placeholder="search movies, shows and people"
          class="w-full min-w-25 ps-9 pe-18 max-sm:text-base"
          aria-keyshortcuts="/"
          @focus="emit('focus')"
          @blur="emit('blur')"
        />

        <!-- The palette's ⌘K listener lives in CommandPalette.vue; "/" in layout.vue. -->
        <span
          v-if="!hasQuery"
          class="absolute inset-ie-1.5 flex gap-1 pointer-events-none [@media(hover:none)]:hidden"
          aria-hidden="true"
        >
          <kbd class="search-kbd font-mono" data-kbd-hint>/</kbd>
          <kbd class="search-kbd font-mono" data-kbd-hint>{{ modKey }}K</kbd>
        </span>

        <button
          v-else
          type="button"
          class="absolute inset-ie-2 size-6 inline-flex items-center justify-center rounded text-fg-muted hover:text-fg focus-visible:(outline-none ring-2 ring-accent)"
          aria-label="clear search"
          tabindex="-1"
          @click="clearSearch"
        >
          <span class="i-lucide:circle-x size-4" aria-hidden="true" />
        </button>
        <button type="submit" class="sr-only">search</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.search-kbd {
  position: relative;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid color-mix(in oklch, var(--fg) 10%, transparent);
  font-size: 11px;
  line-height: 1;
  color: var(--fg-subtle);
}
</style>
