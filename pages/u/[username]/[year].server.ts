import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { pageHead } from "@/shared/head";
import { getUser } from "void/auth";
import { profileRecapPage } from "@/read-models/profile-recap-page";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const page = await profileRecapPage({
    username: c.req.param("username"),
    year: c.req.param("year"),
    viewerId: getUser()?.id ?? null,
  });
  return page.kind === "not_found" ? c.notFound() : page;
});

export const head = defineHead<Props>((_c, { profile, year }) =>
  pageHead({
    title: `${profile.displayName}'s ${year} wrapped`,
    description: `The films, shows and people behind ${profile.displayName}'s ${year}.`,
    type: "profile",
    noindex: profile.visibility !== "public",
  }),
);
