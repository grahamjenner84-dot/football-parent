// Generates the link-preview / structured-data brand images in public/og/.
//
// Run with: node scripts/generate-og-images.mjs
//
// Why this exists: every page on the site shares one brand preview image
// (lib/seo.ts sets it as og:image / twitter:image, lib/ArticleLayout.tsx
// lists the 16:9, 4:3 and 1:1 variants as the BlogPosting `image`). The old
// hand-made og-default.jpg (since removed) was a single 1200x630 with left-aligned text and a
// decorative circle running off the right edge, so anything that crops (a
// square WhatsApp/iMessage thumbnail, a 1:1 Google thumbnail, a 2:1 X card)
// chopped the wordmark. These are built from the signed-off horizontal
// lockup in public/parent/horizontal instead, centred inside the safe zone of
// each variant so no crop between 1:1 and 2:1 touches the logo.
//
// Sizes follow the platform guidance:
//   1200x630  Open Graph / Facebook / WhatsApp / LinkedIn / Slack / iMessage
//             (1.91:1) and X summary_large_image (accepts 1.91:1, crops to 2:1)
//   1200x675  Google Article structured data 16:9
//   1200x900  Google Article structured data 4:3
//   1200x1200 Google Article structured data 1:1
// Google asks for at least 1200px wide and all three ratios; Discover and the
// AI Overview thumbnails pick from the same set.
//
// Output is PNG: the artwork is flat ink with two spot colours, so lossless
// PNG comes out smaller than a JPEG that would fringe the yellow edges, and
// every file is well under WhatsApp's old 300KB scraper limit. None of these
// are loaded by the page itself (only by link scrapers and Googlebot), so
// their size never affects page speed.

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "og");
// The horizontal lockup PNGs ship with an opaque black square behind the
// mark (the source mark was supplied that way), which shows against any
// background that is not pure black. So the lockup is rebuilt here from the
// transparent circle icon plus the wordmark cropped out of the largest
// white lockup, at the lockup's own proportions.
const LOCKUP = path.join(ROOT, "public", "parent", "horizontal", "parent-horizontal-white-2320.png");
const CIRCLE = path.join(ROOT, "public", "parent", "icon", "parent-circle-512.png");
// Measured off parent-horizontal-white-2320.png: the yellow circle sits at
// x 44-635 / y 35-638 inside the 679px square, and the wordmark spans
// x 897-2314 / y 40-613.
const SRC = { w: 2320, h: 679, circle: { x: 44, y: 35, d: 600 }, text: { x: 897, y: 40, w: 1418, h: 574 } };
const FONT = path.join(ROOT, "public", "fonts", "Archivo-Variable.woff2");

// Brand colours from public/parent/readme.txt.
const INK = "#201E1D";
const YELLOW = "#FFC400";
const DOMAIN = "footballparent.co.uk";

// Each variant: output size, and how wide the lockup is drawn. The lockup
// width is chosen so the whole logo (plus the domain line under it) sits
// inside the largest square that fits the canvas, which is the tightest crop
// any preview surface applies to a landscape image.
const VARIANTS = [
  { name: "football-parent-1200x630.png", w: 1200, h: 630, lockupW: 600 },
  { name: "football-parent-1200x675.png", w: 1200, h: 675, lockupW: 640 },
  { name: "football-parent-1200x900.png", w: 1200, h: 900, lockupW: 780 },
  { name: "football-parent-1200x1200.png", w: 1200, h: 1200, lockupW: 880 },
];

GlobalFonts.registerFromPath(FONT, "Archivo");
const rawLockup = await loadImage(LOCKUP);
const circle = await loadImage(CIRCLE);

// Clean transparent lockup at source resolution: circle icon + cropped wordmark.
const clean = createCanvas(SRC.w, SRC.h);
{
  const c = clean.getContext("2d");
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(circle, SRC.circle.x, SRC.circle.y, SRC.circle.d, SRC.circle.d);
  c.drawImage(rawLockup, SRC.text.x, SRC.text.y, SRC.text.w, SRC.text.h, SRC.text.x, SRC.text.y, SRC.text.w, SRC.text.h);
}
const lockup = clean;
const lockupRatio = SRC.h / SRC.w;

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const v of VARIANTS) {
  const canvas = createCanvas(v.w, v.h);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, v.w, v.h);

  const lockupH = Math.round(v.lockupW * lockupRatio);
  const domainSize = Math.round(v.lockupW * 0.062);
  const gap = Math.round(v.lockupW * 0.09);
  const blockH = lockupH + gap + domainSize;

  const x = Math.round((v.w - v.lockupW) / 2);
  const y = Math.round((v.h - blockH) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(lockup, x, y, v.lockupW, lockupH);

  ctx.fillStyle = YELLOW;
  ctx.font = `600 ${domainSize}px Archivo`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  // Letter-spacing is not in the canvas API; a small tracking pass keeps the
  // domain from looking cramped against the condensed wordmark above it.
  const tracking = Math.round(domainSize * 0.06);
  const chars = [...DOMAIN];
  const width = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + tracking * (chars.length - 1);
  let cx = (v.w - width) / 2;
  ctx.textAlign = "left";
  for (const c of chars) {
    ctx.fillText(c, cx, y + lockupH + gap);
    cx += ctx.measureText(c).width + tracking;
  }

  const file = path.join(OUT_DIR, v.name);
  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`${v.name}  ${v.w}x${v.h}  ${kb} KB`);
}
