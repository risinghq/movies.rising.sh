// Keep this file self-contained. The auth-config codegen loader is plain Node ESM
// and does not resolve app-local extensionless TS imports.

import { defineAuth } from "void/auth";
import { username } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { passkey } from "@better-auth/passkey";
import { env } from "void/env";

const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const RESERVED_USERNAMES = new Set(["admin", "support", "official", "staff", "root"]);
const RESET_TOKEN_TTL_SECONDS = 60 * 60;

// Auth-write username validator. UI validation is advisory; this is the boundary check.
function isValidUsername(value: string): boolean {
  return (
    value.length >= USERNAME_MIN &&
    value.length <= USERNAME_MAX &&
    USERNAME_PATTERN.test(value) &&
    !RESERVED_USERNAMES.has(value)
  );
}

// `role` is not user-settable through auth.updateUser.
// Role assignment happens in the create hook below.
export default defineAuth(({ defaults }) => ({
  ...defaults,
  emailAndPassword: {
    ...defaults.emailAndPassword,
    enabled: true,
    resetPasswordTokenExpiresIn: RESET_TOKEN_TTL_SECONDS,
    revokeSessionsOnPasswordReset: true,
    // A dynamic import keeps this file loadable by the auth-config codegen.
    sendResetPassword: async ({ user, url, token }) => {
      const { deliverResetLink } = await import("./src/domain/password-reset");
      await deliverResetLink(user, token, url);
    },
  },
  plugins: [
    ...(defaults.plugins ?? []),
    username({
      minUsernameLength: USERNAME_MIN,
      maxUsernameLength: USERNAME_MAX,
      usernameValidator: (value) => isValidUsername(value),
    }),
    // Void sets `baseURL` to each request's origin, so the relying-party ID and
    // origin default to the serving host: localhost in dev, movies.rising.sh live.
    passkey({ rpName: "tracker" }),
  ],
  user: {
    additionalFields: {
      role: {
        type: ["member", "admin"],
        required: false,
        defaultValue: "member",
        input: false,
      },
      ratingSystem: { type: "string", required: false, defaultValue: "score100", input: true },
      timeZone: { type: "string", required: false, input: true },
      visibility: { type: "string", required: false, defaultValue: "private", input: true },
      avatarEmoji: { type: "string", required: false, input: true },
      avatarColor: { type: "string", required: false, input: true },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Every account needs a username: profiles resolve through /u/{username}.
        // The username plugin has already validated and normalized it.
        before: async (user) => {
          if (typeof user.username !== "string" || user.username.length === 0) {
            throw new APIError("BAD_REQUEST", { message: "choose a username" });
          }
          const role = env.ADMIN_EMAIL && user.email === env.ADMIN_EMAIL ? "admin" : "member";
          return { data: { ...user, role } };
        },
      },
    },
  },
}));
