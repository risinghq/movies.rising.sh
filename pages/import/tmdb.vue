<script setup lang="ts">
import ImportScanning from "@/components/import/ImportScanning.vue";
import { scanTmdb, takePending } from "@/composables/useImportApi";

// TMDB returns here with ?request_token&approved=true, or ?denied=true.
async function scan() {
  const params = new URL(window.location.href).searchParams;
  const pending = takePending("tmdb");
  if (params.get("denied") === "true") return { ok: false as const, error: "not_approved" };
  // The token must match only when TMDB echoes it back; the approval page
  // does not always add it to the redirect.
  const returned = params.get("request_token");
  if (!pending || (returned !== null && returned !== pending.requestToken))
    return { ok: false as const, error: "state_mismatch" };
  return scanTmdb(pending.requestToken);
}
</script>

<template>
  <ImportScanning source-name="TMDB" :scan="scan" />
</template>
