import { describe, expect, it } from "vite-plus/test";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps a same-origin path with its query", () => {
    expect(safeNextPath("/search?q=heat")).toBe("/search?q=heat");
  });

  it("falls back to the home page for anything off-site or missing", () => {
    for (const value of [null, "", "https://evil.test", "//evil.test", "/\\evil.test"]) {
      expect(safeNextPath(value)).toBe("/");
    }
  });
});
