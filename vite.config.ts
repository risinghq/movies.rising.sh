import { fileURLToPath } from "node:url";
import { voidVue } from "@void/vue/plugin";
import { defineConfig, lazyPlugins } from "vite-plus";
import { voidPlugin } from "void";
import UnoCSS from "unocss/vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Vitest 5 cannot attach a second server to Void's worker and page plugins.
      // Unit tests do not load route modules, so they need the schema alias and a
      // real D1 behind `void/db`.
      ...(process.env.VITEST
        ? {
            "@schema": fileURLToPath(new URL("./db/schema.ts", import.meta.url)),
            "void/db": fileURLToPath(new URL("./src/test/d1.ts", import.meta.url)),
          }
        : {}),
    },
  },
  fmt: {
    ignorePatterns: [],
    overrides: [
      {
        files: ["**/*.md", "**/*.yml", "**/*.json", "**/*.jsonc"],
        options: { printWidth: 80, proseWrap: "always" },
      },
    ],
  },
  plugins: lazyPlugins(() =>
    process.env.VITEST
      ? []
      : [voidPlugin(), UnoCSS(), ...voidVue({ prefetch: { defaultStrategy: "hover" } })],
  ),
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ["unicorn", "typescript", "oxc", "vue", "vitest"],
    jsPlugins: ["@e18e/eslint-plugin", "eslint-plugin-regexp"],
    rules: {
      "no-console": "warn",
      "typescript/consistent-type-imports": "error",
      "regexp/no-invalid-regexp": "error",
      "regexp/no-useless-escape": "warn",
    },
    overrides: [
      {
        files: ["routes/**/*", "db/**/*", "src/**/*"],
        rules: {
          "no-console": "off",
        },
      },
    ],
    ignorePatterns: [
      "scripts/**",
      ".output/**",
      ".data/**",
      ".void/**",
      ".cache/**",
      "dist/**",
      "node_modules/**",
    ],
  },
});
