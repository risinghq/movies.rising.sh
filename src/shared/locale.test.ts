import { describe, expect, it } from "vite-plus/test";
import { languageName, regionName } from "./locale";

describe("locale names", () => {
  it("names TMDB language and region codes", () => {
    expect(languageName("ja")).toBe("Japanese");
    expect(regionName("JP")).toBe("Japan");
    expect(regionName("us")).toBe("United States");
  });

  it("falls back to the code", () => {
    expect(languageName("xx")).toBe("xx");
    expect(languageName("not a code")).toBe("not a code");
  });
});
