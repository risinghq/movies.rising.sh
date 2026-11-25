import { describe, expect, it } from "vite-plus/test";
import { parsePersonDetail } from "./person";

function credit(overrides: Record<string, unknown>) {
  return { credit_id: "c", id: 1, media_type: "movie", title: "A Film", ...overrides };
}

describe("parsePersonDetail", () => {
  it("sorts the filmography newest first with undated credits last", () => {
    const detail = parsePersonDetail({
      name: "Someone",
      combined_credits: {
        cast: [
          credit({ credit_id: "old", release_date: "1999-01-01", character: "Lead" }),
          credit({ credit_id: "undated" }),
          credit({
            credit_id: "new",
            media_type: "tv",
            name: "A Show",
            first_air_date: "2020-05-01",
          }),
        ],
        crew: [credit({ credit_id: "job", job: "Director" })],
      },
    });

    expect(detail.acting.map((entry) => [entry.creditId, entry.mediaType])).toEqual([
      ["new", "show"],
      ["old", "movie"],
      ["undated", "movie"],
    ]);
    expect(detail.crew).toEqual([
      expect.objectContaining({ creditId: "job", subtitle: "Director", department: "Crew" }),
    ]);
  });

  it("drops person credits and untitled or unkeyed rows", () => {
    const detail = parsePersonDetail({
      name: "Someone",
      combined_credits: {
        cast: [
          credit({ credit_id: "keep" }),
          credit({ credit_id: "person", media_type: "person" }),
          credit({ credit_id: "untitled", title: null }),
          credit({ credit_id: "" }),
        ],
        crew: [],
      },
    });

    expect(detail.acting.map((entry) => entry.creditId)).toEqual(["keep"]);
    expect(detail.scalars).toMatchObject({ name: "Someone", imdbId: null });
  });
});
