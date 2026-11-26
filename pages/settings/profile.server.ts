import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { pageHead } from "@/shared/head";
import { requireAuth } from "void/auth";
import { getUserProfile } from "@/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const profile = await getUserProfile(requireAuth(c).id);
  if (!profile) return c.notFound();
  const { username, displayName, avatarEmoji, avatarColor, visibility } = profile;
  return { username, displayName, emoji: avatarEmoji, color: avatarColor, visibility };
});

export const head = defineHead<Props>(() => pageHead({ title: "profile", noindex: true }));
