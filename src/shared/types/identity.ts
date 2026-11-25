export type Visibility = "public" | "private";

export type AvatarColor = "sky" | "coral" | "amber" | "emerald" | "violet" | "magenta" | "neutral";

export const AVATAR_COLORS: readonly AvatarColor[] = [
  "sky",
  "coral",
  "amber",
  "emerald",
  "violet",
  "magenta",
  "neutral",
] as const;

export function isAvatarColor(value: unknown): value is AvatarColor {
  return typeof value === "string" && (AVATAR_COLORS as readonly string[]).includes(value);
}

// Handles live under /u/{username}, so they never collide with app routes; these
// rules are about a clean, linkable, lowercase identifier, not route safety.
export const USERNAME_RULES = {
  min: 3,
  max: 20,
  // lowercase letters, digits, underscore. Normalization (lowercasing) is done by
  // the Better Auth username plugin; this is the post-normalization shape.
  pattern: /^[a-z0-9_]+$/,
} as const;

// Reserved only to stop impersonation of the platform, not for routing. Compared
// against the normalized (lowercased) username.
const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "support",
  "official",
  "staff",
  "root",
]);

export function isValidUsername(username: string): boolean {
  return (
    username.length >= USERNAME_RULES.min &&
    username.length <= USERNAME_RULES.max &&
    USERNAME_RULES.pattern.test(username) &&
    !RESERVED_USERNAMES.has(username)
  );
}

/** A valid starting handle derived from a name or an email's local part. The
 * caller still checks availability. */
export function suggestUsername(seed: string): string {
  const base = seed
    .split("@")[0]!
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, USERNAME_RULES.max);
  const padded = (base || "user").padEnd(USERNAME_RULES.min, "_");
  return RESERVED_USERNAMES.has(padded) ? `${padded}_1` : padded;
}
