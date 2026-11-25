import { describe, expect, it } from "vite-plus/test";
import { capDepartments, groupByDepartment, rankCrew, type CrewRow } from "./credits";

const groups = [
  { department: "Writing", members: ["a", "b", "c"] },
  { department: "Sound", members: ["d"] },
];

describe("capDepartments", () => {
  it("keeps the first members of each department and reports the full size", () => {
    expect(capDepartments(groups, 2, null)).toEqual([
      { department: "Writing", total: 3, members: ["a", "b"] },
      { department: "Sound", total: 1, members: ["d"] },
    ]);
  });

  it("keeps every member of the expanded department", () => {
    expect(capDepartments(groups, 2, "Writing")[0]).toEqual({
      department: "Writing",
      total: 3,
      members: ["a", "b", "c"],
    });
  });
});

describe("groupByDepartment", () => {
  it("puts directing, writing and production ahead of the other departments", () => {
    const rows = ["Art", "Sound", "Production", "Zoo", "Writing", "Directing"].map(
      (department) => ({ department }),
    );
    expect(groupByDepartment(rows).map((g) => g.department)).toEqual([
      "Directing",
      "Writing",
      "Production",
      "Sound",
      "Art",
      "Zoo",
    ]);
  });
});

describe("rankCrew", () => {
  const row = (personId: string, job: string, episodeCount: number | null = null): CrewRow => ({
    id: `${personId}:${job}`,
    mediaId: "m",
    personId,
    name: personId,
    slug: personId,
    profilePath: null,
    department: "Production",
    job,
    episodeCount,
  });

  it("opens with the lead jobs, then the most episodes", () => {
    const ranked = rankCrew([
      row("coordinator", "Production Coordinator", 40),
      row("exec", "Executive Producer", 10),
      row("producer", "Producer", 2),
      row("manager", "Production Manager", 60),
    ]);
    expect(ranked.map((r) => r.personId)).toEqual(["producer", "exec", "manager", "coordinator"]);
  });

  it("keeps one entry per person that names each job", () => {
    const ranked = rankCrew([row("a", "Executive Producer"), row("a", "Producer")]);
    expect(ranked).toEqual([{ ...row("a", "Producer"), job: "Producer, Executive Producer" }]);
  });
});
