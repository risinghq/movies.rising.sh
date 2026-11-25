import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { pageHead } from "@/shared/head";
import { getUser } from "void/auth";
import { profilePage } from "@/read-models/profile-page";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const page = await profilePage({
    username: c.req.param("username"),
    viewerId: getUser()?.id ?? null,
  });
  return page.kind === "not_found" ? c.notFound() : page;
});

export const head = defineHead<Props>((_c, page) =>
  pageHead({
    title: `${page.card.identity.displayName} (@${page.card.identity.username})`,
    description: `What ${page.card.identity.displayName} has watched and rated.`,
    type: "profile",
    noindex: page.isPrivate,
  }),
);
