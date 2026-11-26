export const IMPORT_SOURCES = ["trakt", "tmdb", "anilist", "letterboxd", "imdb"] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];
// Sources the user approves on their own site; AniList is read by username;
// the rest arrive as files.
export type ConnectedSource = "trakt" | "tmdb";
export type FileSource = "letterboxd" | "imdb";

// scanned: items staged, waiting for the user's review.
// importing: the queue consumer is writing. done, failed and undone are final.
export const IMPORT_STATES = ["scanned", "importing", "done", "failed", "undone"] as const;
export type ImportState = (typeof IMPORT_STATES)[number];

// What Review shows before anything is written.
export type ImportSummary = {
  titles: number;
  plays: number;
  ratings: number;
  planned: number;
  favorites: number;
  dropped: number;
  skipped: Record<string, number>;
  batchDays: { day: string; plays: number; undatedByDefault: boolean }[];
};

// What Done shows: counts from the plan the import wrote.
export type ImportReport = {
  plays: number;
  undatedPlays: number;
  duplicatePlays: number;
  entriesCreated: number;
  entriesUpdated: number;
  scores: number;
  scoresKept: number;
  favorites: number;
  missingTitles: number;
};
