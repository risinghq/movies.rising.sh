export type CompanyKind = "company" | "network";

const COMPANY_FILTERS = ["all", "movie", "show"] as const;
export type CompanyFilter = (typeof COMPANY_FILTERS)[number];

// TMDB numbers production companies and networks separately, so the path names
// the kind. A production company reads "studio" in the UI and the URL.
const PATH_KIND = { company: "studio", network: "network" } as const;

export function companyLabel(kind: CompanyKind): string {
  return PATH_KIND[kind];
}

export function companySlug(kind: CompanyKind, tmdbId: number): string {
  return `${PATH_KIND[kind]}-${tmdbId}`;
}

export function parseCompanySlug(slug: string): { kind: CompanyKind; tmdbId: number } | null {
  const match = /^(studio|network)-([1-9]\d{0,9})$/.exec(slug);
  if (!match) return null;
  return { kind: match[1] === "studio" ? "company" : "network", tmdbId: Number(match[2]) };
}

export function parseCompanyFilter(value: string | undefined): CompanyFilter {
  return COMPANY_FILTERS.find((f) => f === value) ?? "all";
}
