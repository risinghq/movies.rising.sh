import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { runBatch } from "@/db/kernel";
import { resetDb } from "@/test/d1";
import { findPersonBySlug, personStubsWrite, type PersonRecord } from "@/domain/catalog/people";
import { ensurePersonDetails } from "./person-hydration";

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
