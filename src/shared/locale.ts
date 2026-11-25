// TMDB stores ISO 639-1 language codes and ISO 3166-1 region codes. A code
// Intl does not know reads as the code itself.
const languages = new Intl.DisplayNames(["en"], { type: "language", fallback: "code" });
const regions = new Intl.DisplayNames(["en"], { type: "region", fallback: "code" });

export function languageName(code: string): string {
  try {
    return languages.of(code) ?? code;
  } catch {
    return code;
  }
}

export function regionName(code: string): string {
  try {
    return regions.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
