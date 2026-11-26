export type Theme = "dark" | "light";
export type ThemePreference = Theme | "system";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

export const THEME_STORAGE_KEY = "track-theme";

export const LIGHT_SCHEME_QUERY = "(prefers-color-scheme: light)";

/** Runs in <head> before first paint on every server-rendered page, so a
 * stored light theme never flashes dark. Void does not re-run head scripts on
 * client navigation, and does not need to: the attribute stays on <html>, and
 * the listener stays for the document's life, so "system" follows the OS as
 * it changes. It rereads storage on each change, so a preference set later in
 * the page needs no listener of its own. localStorage throws when storage is
 * blocked; the page then stays dark. */
export const THEME_BOOT_SCRIPT = `try{var k=${JSON.stringify(THEME_STORAGE_KEY)},d=document.documentElement,m=matchMedia(${JSON.stringify(LIGHT_SCHEME_QUERY)});function a(){var t=localStorage.getItem(k);if(t==="system")t=m.matches?"light":"dark";if(t==="light"||t==="dark")d.dataset.theme=t}a();m.addEventListener("change",a)}catch(e){}`;
