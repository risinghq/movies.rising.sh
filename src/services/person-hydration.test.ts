import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { PersonRecord } from "@/domain/catalog/people";
import { ensurePersonDetails } from "./person-hydration";

const mocks = vi.hoisted(() => ({
  fetchPersonDetail: vi.fn<(tmdbId: number) => Promise<unknown>>(),
  findPersonBySlug: vi.fn<(slug: string) => Promise<unknown>>(),
  runBatch: vi.fn<(statements: unknown[]) => Promise<void>>(),
}));

vi.mock("void/log", () => ({ logger: { warn: vi.fn<() => void>() } }));
vi.mock("@/integrations/tmdb", () => ({
  fetchPersonDetail: mocks.fetchPersonDetail,
  tmdbToken: () => "token",
}));
vi.mock("@/db/kernel", () => ({ runBatch: mocks.runBatch }));
vi.mock("@/domain/catalog/people", () => ({
  findPersonBySlug: mocks.findPersonBySlug,
  personScalarsWrite: () => ["write"],
  markPersonDetailsFailedWrite: () => ["mark"],
}));

const detail = { scalars: { name: "New" }, acting: [{ creditId: "a" }], crew: [] };

function person(detailsHydratedAt: number | null): PersonRecord {
  return {
    id: "tmdb:person:1",
    slug: "someone-1",
    name: "Old",
    detailsHydratedAt,
    detailsError: null,
  } as PersonRecord;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchPersonDetail.mockResolvedValue(detail);
  mocks.runBatch.mockResolvedValue();
});

describe("ensurePersonDetails", () => {
  it("serves a fresh person without writing", async () => {
    const fresh = person(Date.now());
    const view = await ensurePersonDetails(fresh);

    expect(view).toEqual({ person: fresh, acting: detail.acting, crew: [] });
    expect(mocks.runBatch).not.toHaveBeenCalled();
    expect(mocks.findPersonBySlug).not.toHaveBeenCalled();
  });

  it("stores the scalars of a stub and returns the stored row", async () => {
    const stored = { ...person(Date.now()), name: "New" };
    mocks.findPersonBySlug.mockResolvedValue(stored);

    const view = await ensurePersonDetails(person(null));

    expect(mocks.runBatch).toHaveBeenCalledWith(["write"]);
    expect(view.person).toBe(stored);
  });

  it("records a failed fetch and returns no filmography", async () => {
    mocks.fetchPersonDetail.mockRejectedValue(new Error("TMDB down"));

    const view = await ensurePersonDetails(person(null));

    expect(mocks.runBatch).toHaveBeenCalledWith(["mark"]);
    expect(view.acting).toEqual([]);
  });
});
