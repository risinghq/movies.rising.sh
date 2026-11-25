import { defineMiddleware } from "void";
import { getUser } from "void/auth";
import { getUserContext, type UserRole } from "@/domain/user";

export default defineMiddleware(async (c, next) => {
  const user = getUser();

  if (!user) {
    c.set("role", "anonymous" satisfies UserRole);
    c.set("shared", { user: null, role: "anonymous" satisfies UserRole });
    await next();
    return;
  }

  // Void marks a signed-in response `private, no-store` unless the route sets
  // its own policy, and the client drops `no-store` page data from its prefetch
  // cache, so a hover prefetch would be fetched again on click. `private,
  // no-cache` still keeps shared caches out; Void keeps it as the route policy.
  if (c.req.method === "GET" && c.req.header("x-voidpages") === "true") {
    c.header("Cache-Control", "private, no-cache");
  }

  const ctx = await getUserContext(user.id);
  c.set("role", ctx.role);
  c.set("shared", {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: ctx.username,
      visibility: ctx.visibility,
    },
    role: ctx.role,
  });

  await next();
});
