// satori stays at 0.32.0: from 0.33.0 its standalone build loads HarfBuzz,
// which reads `self.location.href` and fails on Workers (vercel/satori#878).
import satori, { init as initLayout } from "satori/standalone";
import { Resvg, initWasm as initResvg } from "@resvg/resvg-wasm";
// Workers cannot compile WebAssembly from bytes at runtime, so both engines are
// imported as `.wasm` modules, which the Cloudflare plugin ships precompiled.
import layoutWasm from "satori/yoga.wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
// Satori reads TTF, OTF or WOFF, not WOFF2, so these are the static WOFF cuts.
import geist400 from "@fontsource/geist/files/geist-latin-400-normal.woff?inline";
import geist700 from "@fontsource/geist/files/geist-latin-700-normal.woff?inline";
import geistMono400 from "@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff?inline";
import geistMono500 from "@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff?inline";

/** The element shape satori renders: a React element without React. */
export type OgNode = {
  type: string;
  props: { style?: Record<string, string | number>; children?: OgChild | OgChild[] } & Record<
    string,
    unknown
  >;
};
export type OgChild = OgNode | string | null;

export type OgSize = { width: number; height: number };

let ready: Promise<void> | undefined;

function initEngines(): Promise<void> {
  ready ??= Promise.all([initLayout(layoutWasm), initResvg(resvgWasm)]).then(() => undefined);
  return ready;
}

function fontData(dataUrl: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(",") + 1)), (ch) =>
    ch.charCodeAt(0),
  );
  return bytes.buffer;
}

type Font = { name: string; data: ArrayBuffer; weight: 400 | 500 | 700; style: "normal" };

let fonts: Font[] | undefined;

function loadFonts(): Font[] {
  fonts ??= (
    [
      ["Geist", geist400, 400],
      ["Geist", geist700, 700],
      ["Geist Mono", geistMono400, 400],
      ["Geist Mono", geistMono500, 500],
    ] as const
  ).map(([name, dataUrl, weight]) => ({ name, data: fontData(dataUrl), weight, style: "normal" }));
  return fonts;
}

// Twemoji's file names are the code points; FE0F is dropped unless a ZWJ joins the sequence.
function twemojiCode(emoji: string): string {
  const text = emoji.includes("‍") ? emoji : emoji.replace(/️/g, "");
  return Array.from(text, (ch) => ch.codePointAt(0)!.toString(16)).join("-");
}

async function loadEmoji(segment: string): Promise<string> {
  const url = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${twemojiCode(segment)}.svg`;
  const res = await fetch(url);
  if (!res.ok) return "";
  return `data:image/svg+xml;base64,${btoa(await res.text())}`;
}

/** Renders a satori element tree to a PNG. */
export async function renderPng(node: OgNode, size: OgSize): Promise<Uint8Array<ArrayBuffer>> {
  await initEngines();
  const svg = await satori(node as never, {
    ...size,
    fonts: loadFonts(),
    loadAdditionalAsset: async (code, segment) => (code === "emoji" ? loadEmoji(segment) : ""),
  });
  return new Uint8Array(
    new Resvg(svg, { fitTo: { mode: "width", value: size.width } }).render().asPng(),
  );
}
