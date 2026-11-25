import { db } from "void/db";
import { passwordResetLinks } from "@schema";

/** Keeps one link per user: a new request replaces the previous link. */
export async function recordResetLink(userId: string, token: string, url: string) {
  const row = { token, url, createdAt: Date.now() };
  await db
    .insert(passwordResetLinks)
    .values({ userId, ...row })
    .onConflictDoUpdate({ target: passwordResetLinks.userId, set: row });
}
