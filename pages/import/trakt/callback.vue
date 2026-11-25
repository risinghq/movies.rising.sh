<script setup lang="ts">
import ImportScanning from "@/components/import/ImportScanning.vue";
import { scanTrakt, takePending } from "@/composables/useImportApi";

// Trakt returns here with ?code&state, or ?error when the user declined.
async function scan() {
  const params = new URL(window.location.href).searchParams;
  const pending = takePending("trakt");
  const code = params.get("code");
  if (params.get("error") || !code) return { ok: false as const, error: "not_approved" };
  if (!pending || pending.state !== params.get("state"))
    return { ok: false as const, error: "state_mismatch" };
  return scanTrakt(code, pending.verifier);
}
</script>

<template>
  <ImportScanning source-name="Trakt" :scan="scan" />
</template>
