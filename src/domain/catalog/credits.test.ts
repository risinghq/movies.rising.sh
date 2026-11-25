import { describe, expect, it } from "vite-plus/test";
import { capDepartments } from "./credits";

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
