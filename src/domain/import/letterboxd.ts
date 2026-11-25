import { csvRecords } from "@/shared/csv";
import { FileScanBuilder, readDay, readYear, type FileScan } from "./files";

export type ExportFile = { name: string; text: string };

// A Letterboxd export (Settings, Data, Export) is a ZIP of CSVs. The ones read:
//   diary.csv          Date, Name, Year, Letterboxd URI, Rating, Rewatch, Tags, Watched Date
//   watched.csv        Date, Name, Year, Letterboxd URI
//   ratings.csv        Date, Name, Year, Letterboxd URI, Rating (0.5 to 5)
//   watchlist.csv      Date, Name, Year, Letterboxd URI
//   profile.csv        ..., Favorite Films (film URIs, comma separated)
// Diary URIs point at the log entry, not the film, so titles join on name
// and year. Files under deleted/ and orphaned/ are left out.
export function readLetterboxd(files: readonly ExportFile[]): FileScan {
  const scan = new FileScanBuilder();
  const file = (name: string) => {
    const found = files.find((f) => basePath(f.name) === name);
    return found ? csvRecords(found.text) : [];
  };
  const titleOf = (row: Record<string, string>) => {
    const title = row.Name?.trim();
    if (!title) return null;
    return scan.title({ title, year: readYear(row.Year), imdbId: null, mediaType: "movie" });
  };
  const filmByUri = new Map<string, number>();
  const remember = (row: Record<string, string>, title: number) => {
    const uri = row["Letterboxd URI"]?.trim();
    if (uri) filmByUri.set(uri, title);
  };

  const logged = new Set<number>();
  for (const row of file("diary.csv")) {
    const title = titleOf(row);
    if (title === null) continue;
    logged.add(title);
    scan.add({ kind: "play", title, watchedOn: readDay(row["Watched Date"]) ?? readDay(row.Date) });
  }
  // A film marked watched without a diary entry has no watch date.
  for (const row of file("watched.csv")) {
    const title = titleOf(row);
    if (title === null) continue;
    remember(row, title);
    if (!logged.has(title)) scan.add({ kind: "play", title, watchedOn: null });
  }
  for (const row of file("ratings.csv")) {
    const title = titleOf(row);
    const stars = Number(row.Rating);
    if (title === null) continue;
    remember(row, title);
    if (!(stars > 0 && stars <= 5)) continue;
    scan.add({
      kind: "rating",
      title,
      score100: Math.round(stars * 20),
      ratedOn: readDay(row.Date),
    });
  }
  for (const row of file("watchlist.csv")) {
    const title = titleOf(row);
    if (title === null) continue;
    remember(row, title);
    scan.add({ kind: "planned", title });
  }
  for (const row of file("profile.csv")) {
    for (const uri of (row["Favorite Films"] ?? "").split(/[\s,]+/)) {
      const title = filmByUri.get(uri);
      if (title !== undefined) scan.add({ kind: "favorite", title });
    }
  }
  return scan.build();
}

// The name inside the export, or the bare name of a CSV chosen on its own.
function basePath(name: string): string | null {
  const parts = name.split("/").filter(Boolean);
  if (parts.some((part) => part === "deleted" || part === "orphaned")) return null;
  return parts.at(-1) ?? null;
}
