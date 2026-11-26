import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { pageHead } from "@/shared/head";
import { requireAuth } from "void/auth";
import { getUserProfile } from "@/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const profile = await getUserProfile(requireAuth(c).id);
  if (!profile) return c.notFound();
  const { username, displayName, email, role } = profile;
  return { account: { username, displayName, email }, isAdmin: role === "admin" };
});

export const head = defineHead<Props>(() => pageHead({ title: "account", noindex: true }));
