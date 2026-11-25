<script setup lang="ts">
import { Link } from "@void/vue";
import SettingsSection from "@/components/settings/SettingsSection.vue";
import type { ImportState } from "@/shared/import";
import { sourceName } from "./format";

type Row = { id: string; source: string; state: ImportState; createdAt: number };
defineProps<{ imports: Row[] }>();

const STATE_LABEL: Record<ImportState, string> = {
  scanned: "waiting for review",
  importing: "importing",
  done: "imported",
  failed: "failed",
  undone: "undone",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
</script>

<template>
  <SettingsSection title="past imports">
    <Link
      v-for="row in imports"
      :key="row.id"
      :href="`/import?id=${row.id}`"
      class="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-muted transition-colors"
    >
      <span class="font-mono text-sm text-fg">{{ sourceName(row.source) }}</span>
      <span class="text-xs text-fg-subtle">{{ dateFormat.format(row.createdAt) }}</span>
      <span class="ms-auto text-xs font-mono text-fg-muted">{{ STATE_LABEL[row.state] }}</span>
    </Link>
  </SettingsSection>
</template>
