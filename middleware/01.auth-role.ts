import { defineMiddleware, type CloudContext as Context } from "void";
import { getUser } from "void/auth";
import { getUserContext, type UserRole } from "@/domain/user";

// Pages the username prompt must not block: itself, and the auth screens a
// signed-in user can still reach.
const USERNAME_EXEMPT = new Set(["/welcome", "/login", "/reset-password"]);

/** A signed-in user without a username is sent to /welcome from any page
 * request, document or page data. API calls and assets pass through. */
function needsUsernamePage(c: Context): boolean {
  const { method, path } = c.req;
  if (method !== "GET" || path.startsWith("/api/") || USERNAME_EXEMPT.has(path)) return false;
  return (
    c.req.header("x-voidpages") === "true" || c.req.header("accept")?.includes("text/html") === true
  );
}

export default defineMiddleware(async (c, next) => {
  // Build files that still reach the Worker (CSS, fonts) need no user context;
  // skipping it keeps a D1 query off each of them.
  if (c.req.path.startsWith("/assets/")) {
    await next();
    return;
  }

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
  if (!ctx.username && needsUsernamePage(c)) {
    return c.redirect(
      `/welcome?next=${encodeURIComponent(c.req.path + new URL(c.req.url).search)}`,
    );
  }
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
