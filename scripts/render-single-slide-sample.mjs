// Calls the /api/render/single-slide route with sample joke data and saves
// each PNG to disk, so the server render can be visually compared against
// the same input rendered in the browser tool (public/single-slide-builder.html).
//
// Requires the dev server running (npm run dev). Usage:
//   node scripts/render-single-slide-sample.mjs
//   RENDER_BASE_URL=https://your-deploy.vercel.app node scripts/render-single-slide-sample.mjs

import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.RENDER_BASE_URL || "http://localhost:3000";
const OUT_DIR = "tmp-renders";

const samples = [
  { name: "dark", setup: "Football parents don't have weekends.", punch: "We have *fixtures*.", layout: "A", platform: "ig" },
  { name: "cream", setup: "Nobody warned me", punch: "the *kit washing* never ends.", layout: "C", platform: "tiktok" },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const sample of samples) {
  const { name, ...payload } = sample;
  const res = await fetch(`${BASE_URL}/api/render/single-slide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(`Render failed for "${name}":`, res.status, await res.text());
    process.exitCode = 1;
    continue;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(OUT_DIR, `single-slide-${name}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}
