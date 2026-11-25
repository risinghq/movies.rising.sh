import { defineConfig } from "void/config";
import { SITE_DESCRIPTION, SITE_NAME } from "./src/shared/head";

export default defineConfig({
  // Pages build full titles with pageHead(), so there is no titleTemplate; the
  // title here covers pages without a head export.
  head: {
    title: "track what you watch",
    htmlAttrs: { lang: "en" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#171717" },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "track what you watch" },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:image", content: "/og.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og.png" },
    ],
  },
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
    // rising.sh is onboarded for Email Sending on the account. Leaving
    // `email.from` unset keeps Void's setup out of the deploy, which needs a
    // token scope the CI token lacks; the sender is passed per send instead.
    send_email: [{ name: "SEND_EMAIL" }],
    // D1 lives in ENAM; a page makes several sequential queries, so running the
    // Worker near the database beats running it near a distant visitor. Smart
    // placement never moved it: it needs steady traffic from many locations.
    placement: { mode: "targeted", region: "aws:us-east-1" },
  },
});
