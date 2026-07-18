import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createCanvas, loadImage, GlobalFonts, Image } from "@napi-rs/canvas";

// public/expert-quote-core.js is the same file the browser tool loads via
// <script src="/expert-quote-core.js"> — one drawing implementation, two
// consumers. Loaded via a manual CommonJS compile rather than `require`
// because Next's bundler statically traces `require()` call sites and tries
// to bundle/resolve public/ assets as app modules; a plain runtime fs read +
// Module._compile is invisible to that analysis (same approach as
// lib/renderers/reel-server.ts and lib/renderers/single-slide-server.ts).
function loadCoreModule() {
  const filePath = path.join(process.cwd(), "public", "expert-quote-core.js");
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

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Anton-Regular.woff2"), "Anton");
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Archivo-Variable.woff2"), "Archivo");
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, "SplineSansMono-Variable.woff2"), "Spline Sans Mono");
  fontsRegistered = true;
}

export type ExpertQA = { q?: string; a?: string };
export type ExpertQuoteSlide = { type: "cover" | "bio" | "qa" | "quote" | "cta"; i?: number };
export type ExpertQuoteData = {
  name?: string;
  handle?: string;
  role?: string;
  person?: string;
  quoteWhite?: boolean;
  topic?: string;
  bio?: string;
  bioSrc?: string;
  quoteFirst?: boolean;
  coverStyle?: "question" | "quote" | "classic";
  coverQuestion?: string;
  coverEyebrow?: string;
  coverContext?: string;
  blurb?: string;
  qas: ExpertQA[];
  quote?: string;
  cta?: string;
  interview?: string;
  siteUrl?: string;
  shareLine?: string;
  platform?: "ig" | "tiktok";
  format?: "reel" | "carousel";
  bgBySlide?: Record<string, "dark" | "light">;
};

// Accepts a data: URI (uploaded logo/photo, the common case from the builder's
// file inputs) or an http(s) URL. A bare relative path (the default
// './footballdna-logo.png' the browser resolves against the page) has no
// meaning server-side, so it's treated as "no image" rather than guessed at.
async function loadImgSrc(src: string | null | undefined): Promise<Image | null> {
  if (!src) return null;
  if (src.startsWith("data:")) {
    const comma = src.indexOf(",");
    if (comma === -1) return null;
    const meta = src.slice(5, comma);
    const isBase64 = meta.includes("base64");
    const dataPart = src.slice(comma + 1);
    const buf = isBase64 ? Buffer.from(dataPart, "base64") : Buffer.from(decodeURIComponent(dataPart), "utf8");
    return loadImage(buf);
  }
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error("Failed to fetch image: " + src + " (" + res.status + ")");
    const buf = Buffer.from(await res.arrayBuffer());
    return loadImage(buf);
  }
  return null;
}

// slide/data mirror the browser tool's data model exactly (Core.draw takes
// the same two shapes plus an images bag). logoSrc/bioSrc are passed
// separately rather than read off data.bioSrc alone so callers can supply a
// logo without round-tripping it through the data object.
export async function renderExpertQuoteSlidePNG(
  slide: ExpertQuoteSlide,
  data: ExpertQuoteData,
  logoSrc?: string | null,
  bioSrc?: string | null
): Promise<Buffer> {
  ensureFonts();
  const [logoImg, bioImg] = await Promise.all([
    loadImgSrc(logoSrc),
    loadImgSrc(bioSrc ?? data.bioSrc ?? null),
  ]);
  const dims = Core.dims(data.format) as { W: number; H: number };
  const canvas = createCanvas(dims.W, dims.H);
  const ctx = canvas.getContext("2d");
  Core.draw(ctx, slide, data, { logoImg, bioImg });
  return canvas.toBuffer("image/png");
}

export { Core };
