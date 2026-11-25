import { beforeEach, describe, expect, it } from "vite-plus/test";
import { resetDb } from "@/test/d1";
import { addEntry, addMedia, addUser } from "@/test/fixtures";
import { profilePage } from "./profile-page";

// Every rated entry is 80/100: "4/5" for the viewer, "8/10" for the owner.
beforeEach(async () => {
  await resetDb();
  await addUser({ id: "owner-1", username: "owner", ratingSystem: "score10" });
  await addUser({ id: "viewer-1", username: "viewer", ratingSystem: "score5" });
  await addEntry({ userId: "owner-1", mediaId: await addMedia({ tmdbId: 1 }), score100: 80 });
});

async function viewProfile(viewerId: string | null) {
  return profilePage({
    username: "owner",
    viewerId,
    today: new Date("2026-06-15T12:00:00Z"),
  });
}

describe("profilePage rating system", () => {
  it.each([
    { name: "the viewer's system", viewerId: "viewer-1", averageScore: "4/5" },
    { name: "the default system for an anonymous viewer", viewerId: null, averageScore: "80/100" },
  ])("formats the average in $name and never carries the owner's", async (c) => {
    const page = await viewProfile(c.viewerId);
    const payload = JSON.stringify(page);

    expect(payload).not.toContain("score10");
    expect(payload).not.toContain("8/10");
    expect(page).toMatchObject({ kind: "profile", card: { averageScore: c.averageScore } });
  });

  it("shows the owner their own system", async () => {
    const page = await viewProfile("owner-1");

    expect(page).toMatchObject({ viewer: { owner: true }, card: { averageScore: "8/10" } });
  });
});
