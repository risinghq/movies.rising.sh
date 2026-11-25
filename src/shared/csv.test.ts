import { describe, expect, it } from "vite-plus/test";
import { csvRecords, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("reads quoted fields with commas, quotes and newlines", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi""\nthere"\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"\nthere'],
    ]);
  });

  it("strips a byte order mark and drops empty rows", () => {
    expect(parseCsv("﻿Name,Year\n\nAlien,1979\n\n")).toEqual([
      ["Name", "Year"],
      ["Alien", "1979"],
    ]);
  });
});

describe("csvRecords", () => {
  it("keys each row by the header", () => {
    expect(csvRecords("Name,Year\nAlien,1979\nHeat")).toEqual([
      { Name: "Alien", Year: "1979" },
      { Name: "Heat", Year: "" },
    ]);
  });
});
