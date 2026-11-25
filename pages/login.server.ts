import { defineHandler, defineHead } from "void";
import { getUser } from "void/auth";
import { pageHead } from "@/shared/head";

// A signed-in user has nothing to do here; signing in again would only swap
// accounts without signing out first.
export const loader = defineHandler((c) => {
  if (getUser()) return c.redirect("/");
  return {};
});

export const head = defineHead(() => pageHead({ title: "sign in" }));
