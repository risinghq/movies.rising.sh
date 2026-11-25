import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { listMedia } from "@/domain/catalog/media";
import { entriesWithProgress } from "@/domain/tracking/library-entries";
import { userRatingSystem } from "@/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const user = getUser();

  // Members browse through /search; guests need catalog rows for the landing page.
  return {
    user,
    entries: user ? await entriesWithProgress(user.id) : [],
    catalog: user ? [] : await listMedia({ limit: 24 }),
    ratingSystem: userRatingSystem(user),
  };
});
