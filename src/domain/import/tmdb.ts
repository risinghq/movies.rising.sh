import { toScore100 } from "@/domain/rating";
import type { ImportItem, ImportMediaRef, ImportScan, SkippedItem } from "./items";

// A title from one of the user's TMDB account lists. The rating is the user's
// own, 0.5 to 10.
export type TmdbAccountTitle = {
  media: ImportMediaRef;
  rating: { value: number; ratedAt: number } | null;
};

// The lists TMDB keeps for an account. TMDB has no watch history. A list the
// scan could not read in full is named in `truncated`.
export type TmdbAccountLists = {
  rated: TmdbAccountTitle[];
  watchlist: TmdbAccountTitle[];
  favorites: TmdbAccountTitle[];
  truncated: string[];
};

export function readTmdb(lists: TmdbAccountLists): ImportScan {
  const items: ImportItem[] = [];
  for (const { media, rating } of lists.rated) {
    if (!rating) continue;
    const score100 = Math.round(toScore100(rating.value, "score10"));
    items.push({ kind: "rating", media, score100, ratedAt: rating.ratedAt });
  }
  for (const { media } of lists.watchlist) items.push({ kind: "planned", media });
  for (const { media } of lists.favorites) items.push({ kind: "favorite", media, note: null });

  const skipped: SkippedItem[] = lists.truncated.map((title) => ({
    reason: "list_truncated",
    title,
  }));
  return { items, skipped };
}
