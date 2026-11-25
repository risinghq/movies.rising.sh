import {
  defineConfig,
  presetIcons,
  presetTypography,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      extraProperties: {
        display: "inline-block",
        "forced-color-adjust": "preserve-parent-color",
      },
      warn: true,
      scale: 1.2,
    }),
    presetTypography(),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    spacing: { DEFAULT: "4px" },
    font: {
      mono: "'Geist Mono Variable', 'IBM Plex Sans Arabic', monospace",
      sans: "'Geist Variable', 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif",
    },
    text: {
      "2xs": { fontSize: "0.6875rem" }, // 11px
      "3xs": { fontSize: "0.625rem" }, // 10px
      "4xs": { fontSize: "0.5625rem" }, // 9px
      "5xs": { fontSize: "0.5rem" }, // 8px
    },
    colors: {
      bg: {
        DEFAULT: "var(--bg)",
        subtle: "var(--bg-subtle)",
        muted: "var(--bg-muted)",
        elevated: "var(--bg-elevated)",
      },
      fg: {
        DEFAULT: "var(--fg)",
        muted: "var(--fg-muted)",
        subtle: "var(--fg-subtle)",
      },
      border: {
        DEFAULT: "var(--border)",
        subtle: "var(--border-subtle)",
        hover: "var(--border-hover)",
      },
      accent: {
        DEFAULT: "var(--accent)",
        fallback: "var(--accent-muted)",
      },
      "logo-tile": "var(--logo-tile)",
      syntax: {
        fn: "var(--syntax-fn)",
        str: "var(--syntax-str)",
        kw: "var(--syntax-kw)",
        comment: "var(--syntax-comment)",
      },
      badge: {
        orange: "var(--badge-orange)",
        yellow: "var(--badge-yellow)",
        green: "var(--badge-green)",
        cyan: "var(--badge-cyan)",
        blue: "var(--badge-blue)",
        indigo: "var(--badge-indigo)",
        purple: "var(--badge-purple)",
        pink: "var(--badge-pink)",
      },
      status: {
        planned: "var(--status-planned)",
        watching: "var(--status-watching)",
        completed: "var(--status-completed)",
        paused: "var(--status-paused)",
        dropped: "var(--status-dropped)",
      },
    },
    animation: {
      keyframes: {
        "fade-in": "{from { opacity: 0 } to { opacity: 1 }}",
        "slide-up":
          "{from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) }}",
        "scale-in":
          "{from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) }}",
      },
      durations: {
        "fade-in": "0.3s",
        "slide-up": "0.4s",
        "scale-in": "0.2s",
      },
      timingFns: {
        "fade-in": "ease-out",
        "slide-up": "cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  shortcuts: [
    // `w-full`: the layout wraps pages in a flex column, where auto margins
    // alone shrink a container to its content.
    ["container", "w-full max-w-6xl mx-auto px-4 sm:px-6"],
    ["container-sm", "w-full max-w-5xl mx-auto px-4 sm:px-6"],
    ["flex-split", "flex items-center justify-between"],
    ["focus-ring", "outline-none focus-visible:(ring-2 ring-fg/50 ring-offset-2)"],
    ["link-subtle", "text-fg-muted hover:text-fg transition-colors duration-200 focus-ring"],
    [
      "title-action",
      "inline-flex h-8.5 items-center justify-center gap-1.5 rounded-md border border-border bg-transparent px-3 font-mono text-[0.8125rem] text-fg no-underline transition-colors hover:border-border-hover disabled:opacity-60 focus-ring max-sm:(size-11 px-0)",
    ],
    [
      "box-action",
      "flex h-11 items-center rounded-md border border-border bg-bg-subtle px-4 font-mono text-[0.8125rem] text-fg no-underline transition-colors hover:border-border-hover focus-ring sm:h-9",
    ],
    [
      "favorite-caption",
      "text-[0.6875rem] leading-[0.9375rem] font-mono text-fg line-clamp-2 break-words group-hover:text-accent transition-colors",
    ],
    ["favorite-hint", "text-[0.6875rem] leading-relaxed font-mono text-fg-muted"],
    ["badge-orange", "bg-badge-orange/10 text-badge-orange"],
    ["badge-yellow", "bg-badge-yellow/10 text-badge-yellow"],
    ["badge-green", "bg-badge-green/10 text-badge-green"],
    ["badge-cyan", "bg-badge-cyan/10 text-badge-cyan"],
    ["badge-blue", "bg-badge-blue/10 text-badge-blue"],
    ["badge-indigo", "bg-badge-indigo/10 text-badge-indigo"],
    ["badge-purple", "bg-badge-purple/10 text-badge-purple"],
    ["badge-pink", "bg-badge-pink/10 text-badge-pink"],
    ["badge-subtle", "bg-bg-subtle text-fg-subtle"],
    ["badge-accent", "bg-accent/10 text-accent"],
  ],
  rules: [
    ["animate-fill-both", { "animation-fill-mode": "both" }],
    ["scale-98", { transform: "scale(0.98)" }],
    [
      "text-gradient",
      {
        background: "linear-gradient(to right, #fafafa, #a1a1a1)",
        "-webkit-background-clip": "text",
        "-webkit-text-fill-color": "transparent",
        "background-clip": "text",
      },
    ],
  ],
});
