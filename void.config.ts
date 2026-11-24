import { defineConfig } from "void/config";

export default defineConfig({
  auth: {
    providers: ["email"],
  },
  inference: {
    appType: "void",
    bindings: {
      db: true,
      kv: false,
      storage: false,
      ai: false,
    },
  },
  worker: {
    compatibility_date: "2026-02-24",
    compatibility_flags: ["nodejs_compat", "nodejs_als"],
  },
  cloudflare: {
    name: "movies",
    routes: [{ pattern: "movies.rising.sh", custom_domain: true }],
    // The custom domain is the only public address. Void refuses to republish
    // a Worker whose workers.dev and preview URL state the config leaves out.
    workers_dev: false,
    preview_urls: false,
  },
});
