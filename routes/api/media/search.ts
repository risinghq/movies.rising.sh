import { defineHandler } from "void";
import { getUser } from "void/auth";
import { searchCatalog } from "@/services/media-catalog";

export const GET = defineHandler(async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const limitInput = Number.parseInt(c.req.query("limit") ?? "20", 10);
  const limit = Number.isFinite(limitInput) ? limitInput : 20;

  if (!q) {
    return c.json({ error: "q is required" }, 400);
  }

  const userId = getUser()?.id ?? null;
  try {
    // A signed-in result marks the viewer's library, so only anonymous results are shared.
    c.header(
      "Cache-Control",
      userId ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=120",
    );
    return await searchCatalog({ query: q, limit, userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return c.json({ error: message }, 502);
  }
});
