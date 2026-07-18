import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createCanvas, loadImage, GlobalFonts, Image } from "@napi-rs/canvas";

// public/reel-core.js is the same file the browser tool loads via
// <script src="/reel-core.js"> — one drawing implementation, two consumers.
// Loaded via a manual CommonJS compile rather than `require` because Next's
// bundler statically traces `require()` call sites and tries to bundle/
// resolve public/ assets as app modules; a plain runtime fs read +
// Module._compile is invisible to that analysis (same approach as
// lib/renderers/single-slide-server.ts).
function loadCoreModule() {
  const filePath = path.join(process.cwd(), "public", "reel-core.js");
  const src = fs.readFileSync(filePath, "utf8");
  const mod = new Module(filePath);
  mod.filename = filePath;
  mod.paths = (Module as unknown as { _nodeModulePaths: (p: string) => string[] })._nodeModulePaths(
    path.dirname(filePath)
  );
  (mod as unknown as { _compile: (src: string, filename: string) => void })._compile(src, filePath);
  return mod.exports;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Core: any = loadCoreModule();

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_FILES: Array<[string, string?]> = [
  ["Anton-Regular.woff2", "Anton"],
  ["Archivo-Variable.woff2", "Archivo"],
  ["SplineSansMono-Variable.woff2", "Spline Sans Mono"],
  ["ArchivoBlack-Regular.woff2", "Archivo Black"],
  ["BarlowCondensed-ExtraBold.woff2", "Barlow Condensed"],
  ["BebasNeue-Regular.woff2", "Bebas Neue"],
  ["Montserrat-Black.woff2", "Montserrat"],
  ["Oswald-Bold.woff2", "Oswald"],
  ["Poppins-ExtraBold.woff2", "Poppins"],
  ["Teko-Bold.woff2", "Teko"],
  // Registered under its own real name (Core.EMOJI_FONT_FAMILY === "Noto Emoji") —
  // @napi-rs/canvas doesn't support registering a font under an arbitrary alias.
  ["NotoEmoji-PointDown.woff2"],
];

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  for (const [file, family] of FONT_FILES) {
    GlobalFonts.registerFromPath(path.join(FONTS_DIR, file), family);
  }
  fontsRegistered = true;
}

export type ReelSlide = {
  kind: "hook" | "content" | "cta" | "quote";
  num?: number;
  head?: string;
  body?: string;
  attrib?: string;
  secs?: number;
};
export type ReelBrand = {
  saveLine?: string;
  hookSubtitle?: string;
  handle?: string;
  tiktokHandle?: string;
  ctaUrl?: string;
  ctaLines?: string;
  marginTop?: number;
  marginX?: number;
  marginRight?: number;
  marginBottom?: number;
  tiktokSafe?: boolean;
};
export type ReelLayout = Record<string, unknown>;

async function loadBgImage(url: string | null | undefined): Promise<Image | null> {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch background image: " + url + " (" + res.status + ")");
  const buf = Buffer.from(await res.arrayBuffer());
  return loadImage(buf);
}

// slide/reel/brand mirror the browser tool's data model exactly. layout/style
// are the already-resolved values the browser would compute via
// Core.resolveLayout(slide.kind, template) / Core.resolveStyle(template) —
// the server doesn't know about the template registry, only what it's told
// to draw, exactly like the browser's own drawSlide() call.
export async function renderReelSlidePNG(
  slide: ReelSlide,
  reel: { day?: number; slides: ReelSlide[] },
  brand: ReelBrand,
  layout: ReelLayout,
  style: string,
  bgUrl?: string | null
): Promise<Buffer> {
  ensureFonts();
  const bgImg = await loadBgImage(bgUrl);
  const canvas = createCanvas(Core.WIDTH, Core.HEIGHT);
  const ctx = canvas.getContext("2d");
  Core.drawSlide(ctx, slide, reel, bgImg, 1, 1, brand, layout, style);
  return canvas.toBuffer("image/png");
}

export { Core };
