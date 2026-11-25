import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { pageHead } from "@/shared/head";
import { getUser } from "void/auth";
import { userRatingSystem } from "@/domain/user";
import { searchCatalog } from "@/services/media-catalog";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = getUser();
  const query = c.req.query("q")?.trim() ?? "";

  return {
    query,
    ratingSystem: userRatingSystem(user),
    results: await searchCatalog({ query, limit: 40, userId: user?.id ?? null }),
  };
});

export const head = defineHead<Props>((_c, { query }) =>
  pageHead({ title: query ? `search: ${query}` : "search", noindex: true }),
);
