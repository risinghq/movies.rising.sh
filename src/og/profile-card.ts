import type { ProfileCardModel } from "@/domain/profile-card";
import {
  AVATAR_COLOR_HEX,
  DEFAULT_AVATAR_COLOR,
  avatarInitial,
} from "@/components/identity/avatar";
import { tmdbImage } from "@/shared/tmdb-image";
import type { OgChild, OgNode } from "./render";

export const PROFILE_CARD_SIZE = { width: 1200, height: 630 } as const;

// The dark theme's tokens, as hex because satori does not read oklch.
const BG = "#171717";
const FG = "#fafafa";
const MUTED = "#b4b4b4";
const SUBTLE = "#9b9b9b";
const BORDER = "#2b2b2b";
const ACCENT = "#7dd3fc";
const POSTERS_SHOWN = 4;

function el(type: string, style: Record<string, string | number>, ...children: OgChild[]): OgNode {
  return { type, props: { style: { display: "flex", ...style }, children } };
}

function img(src: string, style: Record<string, string | number>): OgNode {
  return { type: "img", props: { src, style } };
}

function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

function avatar(identity: ProfileCardModel["identity"]): OgNode {
  const glyph = identity.avatarEmoji?.trim() || avatarInitial(identity.displayName);
  return el(
    "div",
    {
      width: 132,
      height: 132,
      borderRadius: 66,
      alignItems: "center",
      justifyContent: "center",
      background: AVATAR_COLOR_HEX[identity.avatarColor ?? DEFAULT_AVATAR_COLOR],
      color: BG,
      fontFamily: "Geist Mono",
      fontSize: 66,
    },
    glyph,
  );
}

function stat(value: string, label: string): OgNode {
  return el(
    "div",
    { flexDirection: "column", gap: 4 },
    el("div", { fontFamily: "Geist Mono", fontWeight: 500, fontSize: 44, color: FG }, value),
    el("div", { fontFamily: "Geist Mono", fontSize: 22, color: SUBTLE }, label),
  );
}

function stats(card: ProfileCardModel): OgNode {
  const items = [
    stat(String(card.stats.tracked), "tracked"),
    stat(String(card.stats.watchDays), "watch days"),
  ];
  if (card.averageScore !== null) items.push(stat(card.averageScore, "avg"));
  return el("div", { gap: 56 }, ...items);
}

function mark(): OgNode {
  const bar = (left: number, fill: string, border?: string) =>
    el("div", {
      position: "absolute",
      left,
      top: 0,
      width: 14,
      height: 34,
      borderRadius: 4,
      background: fill,
      ...(border ? { border: `3px solid ${border}` } : {}),
    });
  return el(
    "div",
    { alignItems: "center", gap: 14 },
    el(
      "div",
      { position: "relative", width: 52, height: 34 },
      bar(0, ACCENT),
      bar(19, ACCENT),
      bar(38, "transparent", FG),
    ),
    el("div", { fontFamily: "Geist Mono", fontSize: 26, color: MUTED }, "movies.rising.sh"),
  );
}

function posters(card: ProfileCardModel): OgNode | null {
  const paths = card.favorites.media
    .map((f) => f.media.posterPath)
    .filter((p): p is string => Boolean(p))
    .slice(0, POSTERS_SHOWN);
  if (paths.length === 0) return null;
  return el(
    "div",
    { flexWrap: "wrap", width: 344, gap: 16, alignContent: "center" },
    ...paths.map((p) =>
      img(tmdbImage(p, "w185"), {
        width: 164,
        height: 246,
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
        objectFit: "cover",
      }),
    ),
  );
}

/** A short hash of what the card draws, so its URL changes when the card does. */
export function profileCardVersion(card: ProfileCardModel): string {
  const { identity, stats } = card;
  const drawn = JSON.stringify([
    identity.displayName,
    identity.avatarEmoji,
    identity.avatarColor,
    stats.tracked,
    stats.watchDays,
    stats.byFormat.movie.tracked,
    stats.byFormat.show.tracked,
    card.averageScore,
    card.favorites.media.slice(0, POSTERS_SHOWN).map((f) => f.media.posterPath),
  ]);
  // FNV-1a, 32-bit.
  let hash = 0x811c9dc5;
  for (let i = 0; i < drawn.length; i++) {
    hash ^= drawn.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** The path of a profile's card image. */
export function profileCardPath(card: ProfileCardModel): string {
  return `/og/u/${card.identity.username}?v=${profileCardVersion(card)}`;
}

/** The 1200×630 link preview for a public profile. */
export function profileCard(card: ProfileCardModel): OgNode {
  const { identity } = card;
  const split = `${plural(card.stats.byFormat.movie.tracked, "movie")} · ${plural(card.stats.byFormat.show.tracked, "show")}`;
  const identityBlock = el(
    "div",
    { alignItems: "center", gap: 36 },
    avatar(identity),
    el(
      "div",
      { flexDirection: "column", gap: 6, maxWidth: 520 },
      el(
        "div",
        { fontFamily: "Geist", fontWeight: 700, fontSize: 64, color: FG, lineHeight: 1.05 },
        identity.displayName,
      ),
      el("div", { fontFamily: "Geist Mono", fontSize: 30, color: SUBTLE }, `@${identity.username}`),
    ),
  );
  const left = el(
    "div",
    { flexDirection: "column", justifyContent: "space-between", flexGrow: 1, height: "100%" },
    identityBlock,
    el(
      "div",
      { flexDirection: "column", gap: 18 },
      stats(card),
      el("div", { fontFamily: "Geist Mono", fontSize: 24, color: MUTED }, split),
    ),
    mark(),
  );
  return el(
    "div",
    {
      width: "100%",
      height: "100%",
      padding: 64,
      gap: 48,
      background: BG,
      color: FG,
      borderTop: `8px solid ${ACCENT}`,
    },
    left,
    posters(card),
  );
}
