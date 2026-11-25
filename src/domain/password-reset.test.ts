import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { db } from "void/db";
import { createEmailTestHarness } from "void/email/testing";
import { passwordResetLinks } from "@schema";
import { resetDb } from "@/test/d1";
import { addUser } from "@/test/fixtures";
import { deliverResetLink } from "./password-reset";

const user = { id: "u1", email: "u1@example.test" };
const url = "https://movies.rising.sh/api/auth/reset-password/tok?callbackURL=%2Freset-password";

describe("deliverResetLink", () => {
  beforeEach(async () => {
    await resetDb();
    await addUser({ id: user.id });
  });
  afterEach(() => vi.restoreAllMocks());

  it("emails the link to the account's address and stores nothing", async () => {
    const inbox = createEmailTestHarness();
    try {
      await deliverResetLink(user, "tok", url);

      expect(inbox.messages).toHaveLength(1);
      const [message] = inbox.messages;
      expect(message.from.email).toBe("tracker@rising.sh");
      expect(message.to.map((to) => to.email)).toEqual([user.email]);
      expect(message.text).toContain(url);
    } finally {
      inbox.dispose();
    }
    expect(await db.select().from(passwordResetLinks)).toEqual([]);
  });

  it("stores the link for the site owner when the send fails", async () => {
    // No harness and no SEND_EMAIL binding: sendEmail reports BINDING_MISSING.
    vi.spyOn(console, "error").mockImplementation(() => {});

    await deliverResetLink(user, "tok", url);

    const rows = await db.select().from(passwordResetLinks);
    expect(rows).toMatchObject([{ userId: user.id, token: "tok", url }]);
  });
});
