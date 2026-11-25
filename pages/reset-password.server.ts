import { defineHandler } from "void";
import type { InferProps } from "void";

export type Props = InferProps<typeof loader>;

// Better Auth's reset link lands here with `?token=` or, for a dead link, `?error=`.
export const loader = defineHandler((c) => ({
  token: c.req.query("token") ?? "",
  linkError: c.req.query("error") ?? "",
}));
