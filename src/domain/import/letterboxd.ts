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
  const rows = (name: string) => {
    const found = files.find((f) => basePath(f.name) === name);
    return found ? csvRecords(found.text) : [];
  };
  const reader = new LetterboxdReader();
  const logged = reader.diary(rows("diary.csv"));
  reader.watched(rows("watched.csv"), logged);
  reader.ratings(rows("ratings.csv"));
  reader.watchlist(rows("watchlist.csv"));
  reader.favorites(rows("profile.csv"));
  return reader.scan.build();
}

type Row = Record<string, string>;

class LetterboxdReader {
  readonly scan = new FileScanBuilder();
  // Film URIs from watched, ratings and watchlist, which profile favorites name.
  private readonly filmByUri = new Map<string, number>();

  // Returns the titles that have a diary entry.
  diary(rows: Row[]): Set<number> {
    const logged = new Set<number>();
    for (const row of rows) {
      const title = this.titleOf(row);
      if (title === null) continue;
      logged.add(title);
      const watchedOn = readDay(row["Watched Date"]) ?? readDay(row.Date);
      this.scan.add({ kind: "play", title, watchedOn });
    }
    return logged;
  }

  // A film marked watched without a diary entry has no watch date.
  watched(rows: Row[], logged: ReadonlySet<number>): void {
    for (const row of rows) {
      const title = this.filmOf(row);
      if (title !== null && !logged.has(title)) {
        this.scan.add({ kind: "play", title, watchedOn: null });
      }
    }
  }

  ratings(rows: Row[]): void {
    for (const row of rows) {
      const title = this.filmOf(row);
      const stars = Number(row.Rating);
      if (title === null || !(stars > 0 && stars <= 5)) continue;
      const score100 = Math.round(stars * 20);
      this.scan.add({ kind: "rating", title, score100, ratedOn: readDay(row.Date) });
    }
  }

  watchlist(rows: Row[]): void {
    for (const row of rows) {
      const title = this.filmOf(row);
      if (title !== null) this.scan.add({ kind: "planned", title });
    }
  }

  favorites(rows: Row[]): void {
    const uris = rows.flatMap((row) => (row["Favorite Films"] ?? "").split(/[\s,]+/));
    for (const uri of uris) {
      const title = this.filmByUri.get(uri);
      if (title !== undefined) this.scan.add({ kind: "favorite", title });
    }
  }

  private titleOf(row: Row): number | null {
    const title = row.Name?.trim();
    if (!title) return null;
    return this.scan.title({ title, year: readYear(row.Year), imdbId: null, mediaType: "movie" });
  }

  // For rows whose Letterboxd URI names the film rather than a diary entry.
  private filmOf(row: Row): number | null {
    const title = this.titleOf(row);
    const uri = row["Letterboxd URI"]?.trim();
    if (title !== null && uri) this.filmByUri.set(uri, title);
    return title;
  }
}

// The name inside the export, or the bare name of a CSV chosen on its own.
function basePath(name: string): string | null {
  const parts = name.split("/").filter(Boolean);
  if (parts.some((part) => part === "deleted" || part === "orphaned")) return null;
  return parts.at(-1) ?? null;
}
