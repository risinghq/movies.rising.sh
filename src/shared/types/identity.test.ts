import { describe, expect, it } from "vite-plus/test";
import { isValidUsername, suggestUsername } from "./identity";

describe("suggestUsername", () => {
  it("derives a valid handle from an email's local part", () => {
    expect(suggestUsername("Jane.Doe+films@example.com")).toBe("jane_doe_films");
  });

  it("derives a valid handle from a display name", () => {
    expect(suggestUsername("  Éva Kovács ")).toBe("eva_kovacs");
  });

  it("pads, truncates and avoids reserved handles", () => {
    expect(suggestUsername("jo")).toBe("jo_");
    expect(suggestUsername("!!!")).toBe("user");
    expect(suggestUsername("a".repeat(30))).toHaveLength(20);
    expect(suggestUsername("admin")).toBe("admin_1");
    for (const seed of ["jo", "!!!", "admin", "Jane.Doe@x.io"]) {
      expect(isValidUsername(suggestUsername(seed))).toBe(true);
    }
  });
});
