import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { pageHead } from "@/shared/head";
import { requireAuth } from "void/auth";
import { getUserProfile } from "@/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);
  const profile = await getUserProfile(user.id);
  if (!profile) return c.notFound();
  return { profile };
});

export const head = defineHead<Props>(() => pageHead({ title: "settings", noindex: true }));
