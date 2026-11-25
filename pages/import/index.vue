<script setup lang="ts">
import { Link } from "@void/vue";
import type { Props } from "./index.server";
import ImportDone from "@/components/import/ImportDone.vue";
import ImportHistory from "@/components/import/ImportHistory.vue";
import ImportProgress from "@/components/import/ImportProgress.vue";
import ImportReview from "@/components/import/ImportReview.vue";
import ImportUndo from "@/components/import/ImportUndo.vue";
import ImportSources from "@/components/import/ImportSources.vue";
import { sourceName } from "@/components/import/format";

const props = defineProps<Props>();
</script>

<template>
  <main class="container flex flex-col gap-8 max-w-2xl py-8 sm:py-12">
    <div>
      <h1 class="text-3xl font-mono font-bold">import</h1>
      <p class="text-fg-muted text-sm mt-1">bring your history from another tracker</p>
    </div>

    <template v-if="props.selected">
      <ImportReview
        v-if="props.selected.state === 'scanned' && props.selected.summary"
        :id="props.selected.id"
        :source-name="sourceName(props.selected.source)"
        :summary="props.selected.summary"
      />
      <ImportProgress
        v-else-if="props.selected.state === 'importing'"
        :id="props.selected.id"
        :source-name="sourceName(props.selected.source)"
      />
      <ImportDone
        v-else-if="props.selected.state === 'done' && props.selected.report"
        :id="props.selected.id"
        :source-name="sourceName(props.selected.source)"
        :report="props.selected.report"
      />
      <section v-else-if="props.selected.state === 'undone'" class="flex flex-col gap-1">
        <p class="font-mono text-fg">import undone</p>
        <p class="text-sm text-fg-muted">
          what this import from {{ sourceName(props.selected.source) }} added is gone.
        </p>
      </section>
      <section v-else class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <p class="font-mono text-fg">import failed</p>
          <p class="text-sm text-fg-muted">
            it stopped partway, after three tries. undo it, then import again from the start.
          </p>
        </div>
        <ImportUndo :id="props.selected.id" />
      </section>
      <Link href="/import" class="text-sm font-mono text-fg-muted hover:text-fg self-start">
        ← all imports
      </Link>
    </template>

    <template v-else>
      <ImportSources />
      <ImportHistory v-if="props.imports.length" :imports="props.imports" />
    </template>
  </main>
</template>
