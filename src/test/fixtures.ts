import { db } from "void/db";
import { libraryEntries, media, watchEvents } from "@schema";
import { userTable } from "@/db/auth-schema";
import { toMediaId, type MediaType } from "@/domain/catalog/media";
import type { RatingSystem } from "@/domain/rating";
import type { Visibility } from "@/shared/types/identity";

// Seeds rows straight into the test D1. Each helper fills only the columns a
// test reads and defaults the rest.

export async function addUser(input: {
  id: string;
  username?: string;
  ratingSystem?: RatingSystem;
  visibility?: Visibility;
  timeZone?: string;
}) {
  const now = new Date(0);
  await db.insert(userTable).values({
    id: input.id,
    name: input.username ?? input.id,
    email: `${input.id}@example.test`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    username: input.username ?? null,
    ratingSystem: input.ratingSystem ?? null,
    visibility: input.visibility ?? "public",
    timeZone: input.timeZone ?? "UTC",
  });
}

export async function addMedia(input: { mediaType?: MediaType; tmdbId: number; title?: string }) {
  const mediaType = input.mediaType ?? "movie";
  const title = input.title ?? `Title ${input.tmdbId}`;
  const id = toMediaId(mediaType, input.tmdbId);
  await db.insert(media).values({
    id,
    mediaType,
    tmdbId: input.tmdbId,
    slug: `${mediaType}-${input.tmdbId}`,
    title,
    createdAt: 0,
    updatedAt: 0,
  });
  return id;
}

export async function addEntry(input: { userId: string; mediaId: string; score100?: number }) {
  await db.insert(libraryEntries).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    mediaId: input.mediaId,
    filedStatus: "completed",
    score100: input.score100 ?? null,
    createdAt: 0,
    updatedAt: 0,
  });
}

// A dated movie play at noon UTC on `watchedOn` (YYYY-MM-DD).
export async function addWatch(input: { userId: string; mediaId: string; watchedOn: string }) {
  await db.insert(watchEvents).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    mediaId: input.mediaId,
    mediaType: "movie",
    watchedAt: Date.parse(`${input.watchedOn}T12:00:00Z`),
    watchedOn: input.watchedOn,
    utcOffsetMinutes: 0,
    createdAt: 0,
  });
}
