import type { MediaType } from "@/domain/catalog/media";
import { toScore100 } from "@/domain/rating";
import { csvRecords } from "@/shared/csv";
import { FileScanBuilder, readDay, readYear, type FileScan } from "./files";
import type { ExportFile } from "./letterboxd";

// IMDb exports each list as its own CSV (Your Ratings, Your Watchlist). Both
// carry Const (the tt-id), Title, Title Type and Year. A ratings file adds
// Your Rating (1 to 10) and Date Rated; a list file has Position. IMDb keeps
// no watch history, so ratings arrive without plays, as from TMDB.
export function readImdb(files: readonly ExportFile[]): FileScan {
  const scan = new FileScanBuilder();
  for (const file of files) {
    const rows = csvRecords(file.text);
    const isList = rows[0] !== undefined && "Position" in rows[0];
    for (const row of rows) readRow(scan, row, isList);
  }
  return scan.build();
}

function readRow(scan: FileScanBuilder, row: Record<string, string>, isList: boolean): void {
  const imdbId = row.Const?.trim() ?? "";
  const name = row.Title?.trim() || imdbId;
  if (!/^tt\d+$/.test(imdbId)) return;
  const rating = Number(row["Your Rating"]);
  const rated = Number.isInteger(rating) && rating >= 1 && rating <= 10;

  const type = (row["Title Type"] ?? "").toLowerCase().replace(/[\s-]/g, "");
  if (type === "tvepisode") {
    if (rated) scan.skip({ reason: "episode_rating", title: name });
    else if (isList) scan.skip({ reason: "episode_listed", title: name });
    return;
  }

  const title = scan.title({
    title: name,
    year: readYear(row.Year),
    imdbId,
    mediaType: MEDIA_TYPES[type] ?? null,
  });
  if (isList) scan.add({ kind: "planned", title });
  if (rated) {
    const score100 = Math.round(toScore100(rating, "score10"));
    scan.add({ kind: "rating", title, score100, ratedOn: readDay(row["Date Rated"]) });
  }
}

// Exports name types in words ("TV Mini Series") or, in older files, in
// camel case ("tvMiniSeries"); both fold to the same key.
const MEDIA_TYPES: Record<string, MediaType> = {
  movie: "movie",
  tvmovie: "movie",
  short: "movie",
  tvshort: "movie",
  video: "movie",
  tvspecial: "movie",
  tvseries: "show",
  tvminiseries: "show",
};
