import type { MediaType } from "@/domain/catalog/media";
import type { EpisodeRef } from "@/shared/tracking";

// Every source reader produces this list. Review, merge and write work on it
// alone, so a new source only adds a reader.
export type ImportMediaRef = { mediaType: MediaType; tmdbId: number; title: string };

export type ImportPlay = {
  kind: "play";
  media: ImportMediaRef;
  episode: EpisodeRef | null;
  // Epoch ms. Null when the date is unknown (see batches.ts).
  watchedAt: number | null;
};

export type ImportRating = {
  kind: "rating";
  media: ImportMediaRef;
  score100: number;
  ratedAt: number;
};

export type ImportPlanned = { kind: "planned"; media: ImportMediaRef };

export type ImportFavorite = { kind: "favorite"; media: ImportMediaRef; note: string | null };

export type ImportDropped = { kind: "dropped"; media: ImportMediaRef };

export type ImportItem = ImportPlay | ImportRating | ImportPlanned | ImportFavorite | ImportDropped;

export type SkipReason = "season_rating" | "episode_rating" | "no_tmdb_id";

export type SkippedItem = { reason: SkipReason; title: string };

export type ImportScan = { items: ImportItem[]; skipped: SkippedItem[] };
