import type { MediaType } from "@/domain/catalog/media";
import type { ImportItem, ImportMediaRef, ImportScan, SkippedItem } from "./items";

// What a file export (Letterboxd, IMDb) yields before its titles are matched
// to TMDB. The browser reads the files and sends only this, so the server
// never receives the rest of the export, such as the profile's email.
export type FileTitle = {
  title: string;
  year: number | null;
  // tt-id. When present the match is exact; otherwise it is by title and year.
  imdbId: string | null;
  // Null lets the match decide between movie and show.
  mediaType: MediaType | null;
};

// `title` indexes FileScan.titles. Days are YYYY-MM-DD.
export type FileEntry =
  | { kind: "play"; title: number; watchedOn: string | null }
  | { kind: "rating"; title: number; score100: number; ratedOn: string | null }
  | { kind: "planned"; title: number }
  | { kind: "favorite"; title: number };

export type FileScan = { titles: FileTitle[]; entries: FileEntry[]; skipped: SkippedItem[] };

// `matches[i]` is the TMDB title for `scan.titles[i]`, or null when none was
// found. Entries of an unmatched title are skipped once per title.
export function matchFileScan(
  scan: FileScan,
  matches: readonly (ImportMediaRef | null)[],
): ImportScan {
  const items: ImportItem[] = [];
  const skipped: SkippedItem[] = [...scan.skipped];
  const unmatched = new Set<number>();

  for (const entry of scan.entries) {
    const media = matches[entry.title];
    if (!media) {
      unmatched.add(entry.title);
      continue;
    }
    items.push(toItem(entry, media));
  }
  for (const index of unmatched) {
    skipped.push({ reason: "no_match", title: scan.titles[index]?.title ?? "Unknown" });
  }
  return { items, skipped };
}

function toItem(entry: FileEntry, media: ImportMediaRef): ImportItem {
  switch (entry.kind) {
    case "play":
      return entry.watchedOn
        ? { kind: "play", media, episode: null, watchedAt: null, watchedOn: entry.watchedOn }
        : { kind: "play", media, episode: null, watchedAt: null };
    case "rating":
      return {
        kind: "rating",
        media,
        score100: entry.score100,
        ratedAt: dayInstant(entry.ratedOn),
      };
    case "planned":
      return { kind: "planned", media };
    case "favorite":
      return { kind: "favorite", media, note: null };
  }
}

// Noon UTC keeps the day when only the day is known.
function dayInstant(day: string | null): number {
  return day ? Date.parse(`${day}T12:00:00Z`) : 0;
}

// Builds a FileScan, giving each distinct title one index.
export class FileScanBuilder {
  private readonly titles: FileTitle[] = [];
  private readonly index = new Map<string, number>();
  private readonly entries: FileEntry[] = [];
  private readonly skipped: SkippedItem[] = [];

  title(title: FileTitle): number {
    const key =
      title.imdbId ?? `${title.mediaType ?? ""}|${title.title.toLowerCase()}|${title.year ?? ""}`;
    const found = this.index.get(key);
    if (found !== undefined) return found;
    this.titles.push(title);
    this.index.set(key, this.titles.length - 1);
    return this.titles.length - 1;
  }

  add(entry: FileEntry): void {
    this.entries.push(entry);
  }

  skip(item: SkippedItem): void {
    this.skipped.push(item);
  }

  build(): FileScan {
    return { titles: this.titles, entries: this.entries, skipped: this.skipped };
  }
}

export function readDay(value: string | undefined): string | null {
  const day = value?.trim().slice(0, 10) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) ? day : null;
}

export function readYear(value: string | undefined): number | null {
  const year = Number(value?.trim());
  return Number.isInteger(year) && year > 1800 && year < 3000 ? year : null;
}
