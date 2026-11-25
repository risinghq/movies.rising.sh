import { describe, expect, it } from "vite-plus/test";
import { companySlug, parseCompanyFilter, parseCompanySlug } from "./company";

describe("company slugs", () => {
  it("round-trips a studio and a network", () => {
    expect(companySlug("company", 5542)).toBe("studio-5542");
    expect(parseCompanySlug("studio-5542")).toEqual({ kind: "company", tmdbId: 5542 });
    expect(parseCompanySlug(companySlug("network", 1))).toEqual({ kind: "network", tmdbId: 1 });
  });

  it("rejects other shapes", () => {
    for (const slug of ["company-1", "studio-0", "studio-01", "studio-1x", "network-", ""]) {
      expect(parseCompanySlug(slug)).toBeNull();
    }
  });

  it("reads an unknown filter as all", () => {
    expect(parseCompanyFilter("show")).toBe("show");
    expect(parseCompanyFilter("person")).toBe("all");
    expect(parseCompanyFilter(undefined)).toBe("all");
  });
});
