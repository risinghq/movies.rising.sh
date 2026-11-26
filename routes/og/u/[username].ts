import { defineHandler } from "void";
import { profilePage } from "@/read-models/profile-page";
import { PROFILE_CARD_SIZE, profileCard } from "@/og/profile-card";
import { renderPng } from "@/og/render";

// The page links here with `?v=` set from the card's contents, so a cached
// image under one URL never goes stale; a day bounds the cache for old links.
const CACHE_SECONDS = 24 * 60 * 60;

function edgeCache(): Cache | undefined {
  return (globalThis as { caches?: { default?: Cache } }).caches?.default;
}

export const GET = defineHandler(async (c) => {
  const cache = edgeCache();
  const hit = await cache?.match(c.req.url);
  if (hit) return hit;

  // Rendered as an anonymous visitor: a private profile has no card.
  const page = await profilePage({ username: c.req.param("username"), viewerId: null });
  if (page.kind === "not_found") return c.notFound();

  const png = await renderPng(profileCard(page.card), PROFILE_CARD_SIZE);
  const response = new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
    },
  });
  await cache?.put(c.req.url, response.clone()).catch(() => undefined);
  return response;
});
