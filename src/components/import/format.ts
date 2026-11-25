const numberFormat = new Intl.NumberFormat("en-US");

export function formatCount(n: number, one: string, many: string): string {
  return `${numberFormat.format(n)} ${n === 1 ? one : many}`;
}

const dayFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// `day` is a local calendar day, YYYY-MM-DD. Formatting it at UTC midnight
// keeps it from shifting to the previous day west of UTC.
export function formatDay(day: string): string {
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}

const SKIPPED: Record<string, [string, string]> = {
  episode_rating: ["episode rating", "episode ratings"],
  season_rating: ["season rating", "season ratings"],
  episode_listed: ["listed episode", "listed episodes"],
  no_tmdb_id: ["title not on TMDB", "titles not on TMDB"],
  no_match: ["title not found on TMDB", "titles not found on TMDB"],
  list_truncated: ["list cut short", "lists cut short"],
};

export function skippedLabel(reason: string, n: number): string {
  const [one, many] = SKIPPED[reason] ?? ["other item", "other items"];
  return formatCount(n, one, many);
}

const SOURCE_NAMES: Record<string, string> = {
  trakt: "Trakt",
  tmdb: "TMDB",
  letterboxd: "Letterboxd",
  imdb: "IMDb",
};

export function sourceName(source: string): string {
  return SOURCE_NAMES[source] ?? source;
}
