import { describe, expect, it } from "vite-plus/test";
import { collapsedItemClass, collapsedToggleClass, initials } from "./favorites";

describe("collapsedItemClass", () => {
  it("shows the first four everywhere", () => {
    expect([0, 1, 2, 3].map(collapsedItemClass)).toEqual(["", "", "", ""]);
  });

  it("shows the fifth and sixth from sm, the seventh and eighth from lg", () => {
    expect([4, 5, 6, 7].map(collapsedItemClass)).toEqual([
      "hidden sm:block",
      "hidden sm:block",
      "hidden lg:block",
      "hidden lg:block",
    ]);
  });
});

describe("collapsedToggleClass", () => {
  it("hides the toggle where every item fits on one line", () => {
    expect(collapsedToggleClass(3)).toBe("hidden");
    expect(collapsedToggleClass(4)).toBe("hidden");
    expect(collapsedToggleClass(5)).toBe("sm:hidden");
    expect(collapsedToggleClass(7)).toBe("lg:hidden");
    expect(collapsedToggleClass(8)).toBe("lg:hidden");
  });

  it("always shows the toggle past eight", () => {
    expect(collapsedToggleClass(9)).toBe("");
  });
});

describe("initials", () => {
  it("takes the first and last word", () => {
    expect(initials("Ennio Morricone")).toBe("EM");
    expect(initials("Bong Joon-ho")).toBe("BJ");
    expect(initials("  Zendaya ")).toBe("Z");
    expect(initials("")).toBe("");
  });
});
