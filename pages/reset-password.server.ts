import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { pageHead } from "@/shared/head";

export type Props = InferProps<typeof loader>;

// Better Auth's reset link lands here with `?token=` or, for a dead link, `?error=`.
export const loader = defineHandler((c) => ({
  token: c.req.query("token") ?? "",
  linkError: c.req.query("error") ?? "",
}));

export const head = defineHead<Props>(() => pageHead({ title: "reset password", noindex: true }));
