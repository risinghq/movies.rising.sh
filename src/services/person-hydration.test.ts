import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { runBatch } from "@/db/kernel";
import { resetDb } from "@/test/d1";
import { findPersonBySlug, personStubsWrite, type PersonRecord } from "@/domain/catalog/people";
import { ensurePersonDetails, loadPerson } from "./person-hydration";

vi.mock("void/env", () => ({ env: { TMDB_READ_ACCESS_TOKEN: "token" } }));

const fetchMock = vi.fn<typeof fetch>();

const tmdbPerson = {
  name: "New Name",
  biography: "A biography.",
  combined_credits: {
    cast: [{ credit_id: "c1", id: 10, media_type: "movie", title: "A Film", character: "Hero" }],
    crew: [],
  },
};

async function storedPerson(): Promise<PersonRecord> {
  await runBatch(
    personStubsWrite([
      {
        tmdbId: 1,
        name: "Old Name",
        gender: null,
        knownForDepartment: null,
        profilePath: null,
        popularity: null,
      },
    ]),
  );
  const person = await findPersonBySlug("old-name-1");
  if (!person) throw new Error("seed failed");
  return person;
}

beforeEach(async () => {
  await resetDb();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => Response.json(tmdbPerson));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadPerson", () => {
  it("returns a stored person without asking TMDB", async () => {
    const stored = await storedPerson();

    expect(await loadPerson("old-name-1")).toEqual(stored);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stores a person TMDB knows by the slug's id", async () => {
    expect(await loadPerson("new-name-5")).toMatchObject({ tmdbId: 5, name: "New Name" });
    expect(await findPersonBySlug("new-name-5")).not.toBeNull();
  });

  it("refuses a slug whose name does not match TMDB's", async () => {
    expect(await loadPerson("someone-else-5")).toBeNull();
    expect(await findPersonBySlug("someone-else-5")).toBeNull();
  });

  it("returns null when TMDB does not know the id", async () => {
    fetchMock.mockImplementation(async () => new Response("missing", { status: 404 }));

    expect(await loadPerson("new-name-6")).toBeNull();
  });
});

describe("ensurePersonDetails", () => {
  it("stores the scalars of a stub and returns the stored row", async () => {
    const view = await ensurePersonDetails(await storedPerson());

    expect(view.person).toMatchObject({ name: "New Name", biography: "A biography." });
    expect(view.person.detailsHydratedAt).not.toBeNull();
    expect(view.acting.map((entry) => entry.title)).toEqual(["A Film"]);
  });

  it("serves a fresh person as stored and takes the filmography from TMDB", async () => {
    const fresh = (await ensurePersonDetails(await storedPerson())).person;
    fetchMock.mockImplementation(async () =>
      Response.json({ ...tmdbPerson, name: "Renamed Since" }),
    );

    const view = await ensurePersonDetails(fresh);

    expect(view.person).toEqual(fresh);
    expect(await findPersonBySlug(fresh.slug)).toMatchObject({ name: "New Name" });
    expect(view.acting).toHaveLength(1);
  });

  it("records a failed fetch and returns no filmography", async () => {
    fetchMock.mockImplementation(async () => new Response("down", { status: 500 }));
    const stub = await storedPerson();

    const view = await ensurePersonDetails(stub);

    expect(view).toEqual({ person: stub, acting: [], crew: [] });
    expect(await findPersonBySlug(stub.slug)).toMatchObject({
      detailsHydratedAt: null,
      detailsError: expect.stringContaining("500"),
    });
  });
});
