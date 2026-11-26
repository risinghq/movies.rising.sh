import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { pageHead } from "@/shared/head";
import { requireAuth } from "void/auth";
import { getUserProfile } from "@/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const profile = await getUserProfile(requireAuth(c).id);
  return profile
    ? { ratingSystem: profile.ratingSystem, timeZone: profile.timeZone }
    : c.notFound();
});

export const head = defineHead<Props>(() => pageHead({ title: "preferences", noindex: true }));
