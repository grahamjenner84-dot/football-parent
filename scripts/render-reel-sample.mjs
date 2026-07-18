// Calls /api/render/reel-slide with sample reel data (matching the browser
// tool's built-in SAMPLE reel) and saves each PNG to disk, so the server
// render can be visually compared against the same input rendered in the
// browser tool (public/reel-builder.html).
//
// Requires the dev server running (npm run dev). Usage:
//   node scripts/render-reel-sample.mjs
//   RENDER_BASE_URL=https://your-deploy.vercel.app node scripts/render-reel-sample.mjs

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Core = require("../public/reel-core.js");

const BASE_URL = process.env.RENDER_BASE_URL || "http://localhost:3000";
const OUT_DIR = "tmp-renders";

const brand = {
  saveLine: "Football parents — save this 👇",
  hookSubtitle: "Watch to the end for every tip",
  handle: "@footballparentuk",
  tiktokHandle: "@footballparent",
  ctaUrl: "footballparent.co.uk",
  ctaLines: "Practical tips for grassroots parents.\n- Save it for later\n- Send it to a football parent",
  marginTop: 250, marginX: 96, marginRight: 96, marginBottom: 220,
};

const reel = {
  day: 1,
  slides: [
    { kind: "hook", head: "34 degrees.\nYour child still wants to play *football*.", secs: 3 },
    { kind: "content", num: 1, head: "Hydration starts the night before.", body: "Not in the car on the way there.", secs: 3 },
    { kind: "quote", head: "Calm is a *tactic*", body: "Your nerves travel straight to them", attrib: "a Premier League scout", secs: 4 },
    { kind: "cta", head: "", secs: 4 },
  ],
};

const templates = Core.builtinTemplates(null);
const samples = [];
for (const tplId of ["default", "design2"]) {
  const tpl = templates.find((t) => t.id === tplId);
  for (const slide of reel.slides) {
    samples.push({
      name: `${tplId}-${slide.kind}`,
      slide, reel, brand,
      layout: Core.resolveLayout(slide.kind, tpl),
      style: Core.resolveStyle(tpl),
      bgUrl: null,
    });
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const sample of samples) {
  const { name, ...payload } = sample;
  const res = await fetch(`${BASE_URL}/api/render/reel-slide`, {
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
  const outPath = path.join(OUT_DIR, `reel-${name}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}
