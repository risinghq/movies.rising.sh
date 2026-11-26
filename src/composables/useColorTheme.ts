import { ref, watch, onMounted } from "vue";
import {
  LIGHT_SCHEME_QUERY,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/shared/theme";

const preference = ref<ThemePreference>("dark");

/** The head script in void.config.ts applies the stored preference on load
 * and follows the OS for "system"; this reads the preference back, persists
 * changes and applies them. No stored preference means dark. */
export function useColorTheme() {
  onMounted(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    preference.value = THEME_PREFERENCES.find((p) => p === stored) ?? "dark";
  });

  watch(preference, (p) => {
    localStorage.setItem(THEME_STORAGE_KEY, p);
    const light = p === "system" ? matchMedia(LIGHT_SCHEME_QUERY).matches : p === "light";
    document.documentElement.dataset.theme = light ? "light" : "dark";
  });

  return { preference };
}
