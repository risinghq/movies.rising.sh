import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { pageHead } from "@/shared/head";
import { safeNextPath } from "@/shared/next-path";
import { suggestUsername } from "@/shared/types/identity";
import { getUserContext } from "@/domain/user";

export type Props = InferProps<typeof loader>;

// Every account needs a username: profiles, follows and links resolve through
// /u/{username}. The auth middleware sends a signed-in user without one here.
export const loader = defineHandler(async (c) => {
  const user = requireAuth(c, { throwRedirect: "/login" });
  const next = safeNextPath(c.req.query("next"));
  const { username } = await getUserContext(user.id);
  if (username) return c.redirect(next);
  return { suggestion: suggestUsername(user.name || user.email), next };
});

export const head = defineHead<Props>(() =>
  pageHead({ title: "choose a username", noindex: true }),
);
