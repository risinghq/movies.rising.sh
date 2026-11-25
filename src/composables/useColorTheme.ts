import { ref, watch, onMounted } from "vue";
import { THEME_STORAGE_KEY, type Theme } from "@/shared/theme";

const theme = ref<Theme>("dark");

/** The head script in void.config.ts applies the stored theme on load; this
 * reads it back and persists changes. */
export function useColorTheme() {
  onMounted(() => {
    theme.value = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  });

  watch(theme, (t) => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem(THEME_STORAGE_KEY, t);
  });

  return {
    theme,
    toggle: () => {
      theme.value = theme.value === "dark" ? "light" : "dark";
    },
  };
}
