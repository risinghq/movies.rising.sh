// Community stats only render once enough users engage, so a tiny user base
// never shows an embarrassing "score 80 from 1 person".
export const STATS_MIN_TRACKED = 3;
export const STATS_MIN_SCORES = 5;

export const TIMELINE_DAYS = 30;

export function countText(n: number): string {
  return n.toLocaleString("en-US");
}

export function watchesText(n: number): string {
  return `${countText(n)} ${n === 1 ? "watch" : "watches"}`;
}
