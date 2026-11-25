import { db } from "void/db";
import { sendEmail, type SendEmailOptions } from "void/email";
import { passwordResetLinks } from "@schema";

const RESET_SENDER = "tracker <tracker@rising.sh>";

function resetEmail(to: string, url: string): SendEmailOptions {
  return {
    from: RESET_SENDER,
    to,
    subject: "Reset your tracker password",
    text: [
      "Someone asked to reset the password of your tracker account.",
      "",
      `Open this link to choose a new password: ${url}`,
      "",
      "The link works once, within 1 hour. If you did not ask for it, ignore this email.",
    ].join("\n"),
  };
}

/**
 * Emails the reset link. A failed send stores the link instead, so the site
 * owner can pass it on by hand (docs/development.md).
 */
export async function deliverResetLink(
  user: { id: string; email: string },
  token: string,
  url: string,
) {
  const result = await sendEmail(resetEmail(user.email, url));
  if (result.ok) return;

  console.error(
    "password reset email failed",
    "error" in result ? result.error : result.deliveries,
  );
  await recordResetLink(user.id, token, url);
}

/** Keeps one link per user: a new request replaces the previous link. */
async function recordResetLink(userId: string, token: string, url: string) {
  const row = { token, url, createdAt: Date.now() };
  await db
    .insert(passwordResetLinks)
    .values({ userId, ...row })
    .onConflictDoUpdate({ target: passwordResetLinks.userId, set: row });
}
