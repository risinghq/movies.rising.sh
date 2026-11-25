<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "@void/vue";
import { importState } from "@/composables/useImportApi";

const props = defineProps<{ id: string; sourceName: string }>();
const router = useRouter();

const POLL_MS = 2000;
let timer: ReturnType<typeof setTimeout> | undefined;

async function poll() {
  const state = await importState(props.id);
  if (state && state !== "importing") {
    void router.visit(`/import?id=${props.id}`, { replace: true, preserveScroll: true });
    return;
  }
  timer = setTimeout(poll, POLL_MS);
}

onMounted(() => {
  timer = setTimeout(poll, POLL_MS);
});
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div class="flex items-center gap-3" role="status">
    <span class="i-lucide:loader-circle w-5 h-5 animate-spin text-fg-muted" aria-hidden="true" />
    <div>
      <p class="font-mono text-fg">importing from {{ props.sourceName }}...</p>
      <p class="text-xs text-fg-subtle">
        this takes under a minute. you can leave this page; it keeps going.
      </p>
    </div>
  </div>
</template>
