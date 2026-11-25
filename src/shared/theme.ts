export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "track-theme";

/** Runs in <head> before first paint on every server-rendered page, so a
 * stored light theme never flashes dark. Void does not re-run head scripts on
 * client navigation, and does not need to: the attribute stays on <html>.
 * localStorage throws when storage is blocked; the page then stays dark. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
