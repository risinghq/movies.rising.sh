import { defineEnv, string } from "void/env";

export default defineEnv({
  TMDB_READ_ACCESS_TOKEN: string().optional(),
  TRAKT_CLIENT_ID: string().optional(),
  BETTER_AUTH_SECRET: string(),
  ADMIN_EMAIL: string().optional(),
});
