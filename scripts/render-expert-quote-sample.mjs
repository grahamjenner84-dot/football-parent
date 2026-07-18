// Calls /api/render/expert-quote with sample data (matching the builder's
// "Load Football DNA sample" state) and saves each slide's PNG to disk, so
// the server render can be visually compared against the same input
// rendered in the browser tool (public/expert-quote-builder.html).
//
// Requires the dev server running (npm run dev). Usage:
//   node scripts/render-expert-quote-sample.mjs
//   RENDER_BASE_URL=https://your-deploy.vercel.app node scripts/render-expert-quote-sample.mjs

import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.RENDER_BASE_URL || "http://localhost:3000";
const OUT_DIR = "tmp-renders";

const baseData = {
  name: "Football DNA",
  handle: "@footballdna_",
  role: "Academy coaches · player development",
  person: "",
  quoteWhite: false,
  topic: "On the *Future Fit* changes",
  bio: "A grassroots-to-academy coaching team behind thousands of young players. Coach education, player development and the stuff parents actually ask about.",
  bioSrc: "",
  quoteFirst: false,
  coverStyle: "question",
  coverQuestion: "",
  coverEyebrow: "A parent asks",
  coverContext: "",
  blurb: "Honest, jargon-free help for parents of grassroots and academy players. New expert Q&A every week.",
  qas: [
    { q: "Will my child still get game time under Future Fit?", a: "More than before. Smaller squads mean *every player* is on the pitch longer, not freezing on the sideline." },
    { q: "Is it bad that we are not playing for league points?", a: "No. Taking the scoreboard away lets kids *try things*, make mistakes and actually develop." },
  ],
  quote: "Future Fit isn't about *winning* at eight. It's about still playing at eighteen.",
  cta: "Know a parent asking about *Future Fit?*",
  interview: "Full article — link in our bio",
  siteUrl: "footballparent.co.uk",
  shareLine: "Share it with them",
  platform: "ig",
  format: "reel",
  bgBySlide: {},
};

const slides = [
  { type: "cover", i: undefined },
  { type: "bio" },
  { type: "qa", i: 0 },
  { type: "qa", i: 1 },
  { type: "quote" },
  { type: "cta" },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

async function renderOne(name, slide, data) {
  const res = await fetch(`${BASE_URL}/api/render/expert-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slide, data }),
  });
  if (!res.ok) {
    console.error(`Render failed for "${name}":`, res.status, await res.text());
    process.exitCode = 1;
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(OUT_DIR, `expert-${name}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

for (const slide of slides) {
  await renderOne(`default-${slide.type}${slide.i != null ? slide.i : ""}`, slide, baseData);
}

// Cover style variants (question is covered above)
await renderOne("cover-quote", { type: "cover" }, { ...baseData, coverStyle: "quote" });
await renderOne("cover-classic", { type: "cover" }, { ...baseData, coverStyle: "classic" });

// Light theme + white pull-quote variant
await renderOne("light-quote", { type: "quote" }, { ...baseData, quoteWhite: true, bgBySlide: { quote: "light" } });
await renderOne("light-cover", { type: "cover" }, { ...baseData, bgBySlide: { cover: "light" } });

// Carousel (4:5) format
await renderOne("carousel-cover", { type: "cover" }, { ...baseData, format: "carousel" });
await renderOne("carousel-cta", { type: "cta" }, { ...baseData, format: "carousel" });

// TikTok handle variant on the CTA follow pill / footer
await renderOne("tiktok-cta", { type: "cta" }, { ...baseData, platform: "tiktok" });
