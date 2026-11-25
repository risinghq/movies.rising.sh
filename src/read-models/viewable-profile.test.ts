import { beforeEach, describe, expect, it } from "vite-plus/test";
import { resetDb } from "@/test/d1";
import { addUser } from "@/test/fixtures";
import type { ProfileIdentity } from "@/domain/user";
import { findViewableProfile, viewerRelation } from "./viewable-profile";

function profile(visibility: ProfileIdentity["visibility"]): ProfileIdentity {
  return {
    id: "user-1",
    username: "dubu",
    displayName: "Dubu",
    avatarEmoji: null,
    avatarColor: null,
    joinedAt: 0,
    timeZone: "UTC",
    visibility,
  };
}

describe("viewerRelation", () => {
  it.each([
    { visibility: "public", viewerId: null, owner: false },
    { visibility: "private", viewerId: "user-1", owner: true },
    { visibility: "private", viewerId: "someone-else", owner: null },
    { visibility: "private", viewerId: null, owner: null },
  ] as const)("$visibility profile for viewer $viewerId", ({ visibility, viewerId, owner }) => {
    const found = profile(visibility);

    expect(viewerRelation(found, viewerId)).toEqual(
      owner === null ? null : { profile: found, owner },
    );
  });
});

describe("findViewableProfile", () => {
  beforeEach(async () => {
    await resetDb();
    await addUser({ id: "user-1", username: "dubu" });
  });

  it("finds a profile by username in any case", async () => {
    await expect(findViewableProfile("Dubu", "user-1")).resolves.toMatchObject({
      profile: { id: "user-1", username: "dubu" },
      owner: true,
    });
  });

  it.each([undefined, "nobody"])("returns null for username %s", async (username) => {
    await expect(findViewableProfile(username, null)).resolves.toBeNull();
  });
});
