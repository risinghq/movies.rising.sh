<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "@void/vue";
import Btn from "@/components/ui/Btn.vue";
import { importMessage, undoImport } from "@/composables/useImportApi";

const props = defineProps<{ id: string }>();
const router = useRouter();

const undoing = ref(false);
const error = ref("");

async function undo() {
  undoing.value = true;
  error.value = "";
  const result = await undoImport(props.id);
  if (!result.ok) {
    undoing.value = false;
    error.value = importMessage(result.error);
    return;
  }
  void router.visit(`/import?id=${props.id}`, { replace: true });
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <Btn class="self-start" classicon="i-lucide:undo-2" :disabled="undoing" @click="undo">
      {{ undoing ? "undoing..." : "undo import" }}
    </Btn>
    <p class="text-xs text-fg-subtle">
      undo removes the titles, plays and scores this import added. a title you already had keeps the
      changes made to it.
    </p>
    <p v-if="error" role="alert" class="text-xs text-red-400 font-mono">{{ error }}</p>
  </div>
</template>
