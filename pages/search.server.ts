import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { pageHead } from "@/shared/head";
import { getUser } from "void/auth";
import { getUserSettings } from "@/domain/user";
import { searchCatalog } from "@/services/media-catalog";
import type { RatingSystem } from "@/domain/rating";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = getUser();
  const query = c.req.query("q")?.trim() ?? "";

  const [settings, results] = await Promise.all([
    user ? getUserSettings(user.id) : Promise.resolve(null),
    searchCatalog({ query, limit: 40, userId: user?.id ?? null }),
  ]);

  return {
    query,
    ratingSystem: (settings?.ratingSystem ?? "score100") as RatingSystem,
    results,
  };
});

export const head = defineHead<Props>((_c, { query }) =>
  pageHead({ title: query ? `search: ${query}` : "search", noindex: true }),
);
