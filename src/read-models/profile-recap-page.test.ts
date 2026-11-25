import { beforeEach, describe, expect, it } from "vite-plus/test";
import { resetDb } from "@/test/d1";
import { addMedia, addUser, addWatch } from "@/test/fixtures";
import { profileRecapPage } from "./profile-recap-page";

const today = new Date("2026-06-15T12:00:00Z");

function viewRecap(year: string, username = "dubu") {
  return profileRecapPage({ username, year, viewerId: null, today });
}

// dubu watched one movie in 2025 and one in 2026; hidden is private.
beforeEach(async () => {
  await resetDb();
  await addUser({ id: "user-1", username: "dubu" });
  await addUser({ id: "user-2", username: "hidden", visibility: "private" });
  const mediaId = await addMedia({ tmdbId: 1 });
  await addWatch({ userId: "user-1", mediaId, watchedOn: "2025-03-01" });
  await addWatch({ userId: "user-1", mediaId, watchedOn: "2026-02-01" });
  await addWatch({ userId: "user-2", mediaId, watchedOn: "2025-03-01" });
});

describe("profileRecapPage", () => {
  it.each([
    { name: "a private profile", username: "hidden", year: "2025" },
    { name: "an invalid year", username: "dubu", year: "nope" },
    { name: "a year with no activity", username: "dubu", year: "2024" },
  ])("returns not_found for $name", async (c) => {
    await expect(viewRecap(c.year, c.username)).resolves.toEqual({ kind: "not_found" });
  });

  it("locks the current year for visitors before December", async () => {
    await expect(viewRecap("2026")).resolves.toMatchObject({
      kind: "recap",
      recapAccess: "locked",
      wrapped: null,
    });
  });

  it("loads the wrapped summary for a past year", async () => {
    await expect(viewRecap("2025")).resolves.toMatchObject({
      kind: "recap",
      recapAccess: "open",
      wrapped: { year: 2025 },
    });
  });
});
