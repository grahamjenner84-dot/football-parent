// Generates the favicon set in app/ from the signed-off brand icons in
// public/parent, so the tab icon, Google's search-result favicon and the iOS
// home-screen icon all come from the same artwork as the rest of the brand.
//
// Run with: node scripts/generate-favicons.mjs
//
// Next's file conventions (app/favicon.ico, app/icon.png, app/apple-icon.png)
// emit the <link> tags themselves, so nothing in app/layout.tsx needs to
// list them. The Coach App landing segment gets its own icon.png and
// apple-icon.png, which Next scopes to that route.
//
//   favicon.ico   16 + 32 + 48 px, PNG-compressed entries. sizes="any", the
//                 legacy path every browser and crawler still tries first.
//   icon.png      192x192, a multiple of 48 as Google's favicon guidance
//                 asks for, and the size Android/PWA surfaces use.
//   apple-icon.png 180x180, the size iOS actually requests.
//
// The previous app/icon.png was an 825 KB, 1254px export of the old artwork
// that every first visit downloaded for a 16px tab icon. The whole set here
// is under 60 KB.

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICONS = path.join(ROOT, "public", "parent", "icon");
const COACH_ICONS = path.join(ROOT, "public", "parent", "coach", "icon");

const TARGETS = [
  { dir: path.join(ROOT, "app"), src: ICONS, prefix: "parent-icon", ico: true },
  { dir: path.join(ROOT, "app", "football-parent-coach-app"), src: COACH_ICONS, prefix: "coach-icon", ico: false },
];

async function resize(file, size) {
  const img = await loadImage(file);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, size, size);
  return canvas.toBuffer("image/png");
}

// ICO container with PNG-compressed entries (supported by every browser that
// matters since IE11/Vista). Header 6 bytes, one 16-byte directory entry per
// image, then the image data back to back.
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = header.length + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o); // width
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1); // height
    dir.writeUInt8(0, o + 2); // palette
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // colour planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

function report(file) {
  console.log(`${path.relative(ROOT, file)}  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}

for (const t of TARGETS) {
  const big = path.join(t.src, `${t.prefix}-512.png`);

  const icon = path.join(t.dir, "icon.png");
  fs.writeFileSync(icon, await resize(big, 192));
  report(icon);

  const apple = path.join(t.dir, "apple-icon.png");
  fs.copyFileSync(path.join(t.src, `${t.prefix}-180.png`), apple);
  report(apple);

  if (t.ico) {
    const pngs = [
      { size: 16, data: fs.readFileSync(path.join(t.src, `${t.prefix}-16.png`)) },
      { size: 32, data: fs.readFileSync(path.join(t.src, `${t.prefix}-32.png`)) },
      { size: 48, data: await resize(big, 48) },
    ];
    const ico = path.join(t.dir, "favicon.ico");
    fs.writeFileSync(ico, buildIco(pngs));
    report(ico);
  }
}
