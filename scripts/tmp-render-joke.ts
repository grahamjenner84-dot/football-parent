#!/usr/bin/env tsx
// THROWAWAY - generates + QCs + renders a joke carousel locally (no
// Supabase/DB writes), dumping structured JSON + an MP4 for review. Delete
// after use.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

const FFMPEG_DIR =
  "C:\\Users\\graha\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin";
process.env.PATH = `${FFMPEG_DIR};${process.env.PATH}`;

import { generateJokeCarousel } from "../lib/instagram/copy-flow";
import { runQcOnGeneratedCopy } from "../lib/instagram/copy-qc-adapter";
import { renderReelSlidePNG, Core as ReelCore } from "../lib/renderers/reel-server";
import { assembleSlideshowMp4, checkFfmpegAvailable, FFMPEG_INSTALL_HINT } from "../lib/renderers/assemble-video";

async function main() {
  const theme = process.argv.find((a) => a.startsWith("--theme="))?.slice("--theme=".length) ?? "the WhatsApp group chat the night before a match";
  const outMp4 = process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length) ?? path.join(REPO_ROOT, "tmp-renders", "joke-reel-final.mp4");
  const outJson = outMp4.replace(/\.mp4$/, ".json");

  console.error(`Generating joke carousel: "${theme}"`);
  const result = await generateJokeCarousel(theme);
  const qc = await runQcOnGeneratedCopy(result, null);

  if (!checkFfmpegAvailable()) {
    console.error(FFMPEG_INSTALL_HINT);
    process.exitCode = 1;
    return;
  }

  const payload = result.renderPayload as { reel: { slides: Array<Record<string, unknown> & { kind: string; secs?: number }> }; brand: Record<string, unknown>; templateId: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templates = ReelCore.builtinTemplates(null) as any[];
  const tpl = templates.find((t) => t.id === payload.templateId) ?? templates[0];

  const frames = [];
  for (let i = 0; i < payload.reel.slides.length; i++) {
    const slide = payload.reel.slides[i];
    const layout = ReelCore.resolveLayout(slide.kind, tpl);
    const style = ReelCore.resolveStyle(tpl);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const png = await renderReelSlidePNG(slide as any, payload.reel as any, payload.brand as never, layout as never, style, null);
    frames.push({ pngBuffer: png, durationSec: slide.secs ?? 3 });
    console.error(`  rendered frame ${i + 1}/${payload.reel.slides.length} (${slide.kind}, ${slide.secs ?? 3}s)`);
  }
  const mp4 = await assembleSlideshowMp4(frames, { audioUrl: null });
  fs.mkdirSync(path.dirname(outMp4), { recursive: true });
  fs.writeFileSync(outMp4, mp4);
  const totalSec = frames.reduce((s, f) => s + f.durationSec, 0);
  console.error(`Wrote ${outMp4} (${(mp4.length / 1024 / 1024).toFixed(2)} MB, ~${totalSec.toFixed(1)}s)`);

  const summary = {
    theme,
    slides: result.slides,
    caption: result.caption,
    generationCost: result.usage.costUsd,
    qcCost: qc.apiCostUsd,
    qcPassed: qc.passed,
    hardFails: qc.hardFails,
    softFlags: qc.softFlags,
    hookStrength: qc.tier2?.hookStrength ?? null,
    mp4Path: outMp4,
  };
  fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
