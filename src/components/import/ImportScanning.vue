<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "@void/vue";
import { importMessage, type ApiResult } from "@/composables/useImportApi";

const props = defineProps<{ sourceName: string; scan: () => Promise<ApiResult<{ id: string }>> }>();
const router = useRouter();
const error = ref("");

onMounted(async () => {
  const result = await props.scan();
  if (!result.ok) {
    error.value = importMessage(result.error);
    return;
  }
  void router.visit(`/import?id=${result.value.id}`, { replace: true });
});
</script>

<template>
  <main class="container flex flex-col items-center gap-3 max-w-md py-16 text-center">
    <template v-if="!error">
      <span
        class="i-lucide:loader-circle w-8 h-8 text-fg-subtle motion-safe:animate-spin"
        aria-hidden="true"
      />
      <p class="font-mono text-fg-muted" role="status">
        reading your {{ props.sourceName }} account...
      </p>
      <p class="text-sm text-fg-subtle">a large history takes a few seconds.</p>
    </template>
    <template v-else>
      <span class="i-lucide:circle-alert w-8 h-8 text-fg-subtle" aria-hidden="true" />
      <p class="font-mono text-fg-muted" role="alert">{{ error }}</p>
      <a href="/import" class="text-sm font-mono text-accent hover:underline">back to import</a>
    </template>
  </main>
</template>
