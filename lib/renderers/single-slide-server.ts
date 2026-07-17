import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

// public/single-slide-core.js is the same file the browser tool loads via
// <script src="/single-slide-core.js"> — one drawing implementation, two
// consumers. Loaded via a manual CommonJS compile (not `require`) because
// Next's bundler statically traces `require()` call sites and tries to
// bundle/resolve public/ assets as app modules, which fails at build time;
// a plain runtime fs read + Module._compile is invisible to that analysis,
// the same reason lib/content.ts reads MDX files with fs.readFileSync
// instead of importing them.
function loadCoreModule() {
  const filePath = path.join(process.cwd(), "public", "single-slide-core.js");
  const src = fs.readFileSync(filePath, "utf8");
  const mod = new Module(filePath);
  mod.filename = filePath;
  mod.paths = (Module as unknown as { _nodeModulePaths: (p: string) => string[] })._nodeModulePaths(
    path.dirname(filePath)
  );
  (mod as unknown as { _compile: (src: string, filename: string) => void })._compile(src, filePath);
  return mod.exports;
}
const Core = loadCoreModule();

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Anton-Regular.woff2"), "Anton");
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Archivo-Variable.woff2"), "Archivo");
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, "SplineSansMono-Variable.woff2"), "Spline Sans Mono");
  // Registered under its own real name (Core.EMOJI_FONT_FAMILY === "Noto Emoji") —
  // @napi-rs/canvas doesn't support registering a font under an arbitrary alias.
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, "NotoEmoji-PointDown.woff2"));
  fontsRegistered = true;
}

export type Joke = { setup?: string; punch: string; layout?: "A" | "C" };
export type Platform = "ig" | "tiktok";

export function renderSingleSlidePNG(joke: Joke, platform: Platform = "ig"): Buffer {
  ensureFonts();
  const canvas = createCanvas(Core.WIDTH, Core.HEIGHT);
  const ctx = canvas.getContext("2d");
  Core.drawJoke(ctx, { setup: joke.setup || "", punch: joke.punch, layout: joke.layout === "C" ? "C" : "A" }, platform);
  return canvas.toBuffer("image/png");
}
