// Reads link-audit-voice.json (written by `node internal-link-audit.mjs`
// at the repo root) and upserts each page's body/voice word counts (and
// derived voice_pct) into the content-status tracker. Run manually after an
// internal-link-audit.mjs pass - not wired into the build.
// Run: npx tsx scripts/seo/cli/sync-voice-stats.ts
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { setVoiceStats } from "../database/content-status";
import { REPO_ROOT } from "../shared/env";

const VOICE_JSON_PATH = path.join(REPO_ROOT, "link-audit-voice.json");

type VoiceEntry = { bodyWordCount: number; voiceWordCount: number };

function main(): void {
  if (!fs.existsSync(VOICE_JSON_PATH)) {
    console.error(`${VOICE_JSON_PATH} not found - run \`node internal-link-audit.mjs\` first.`);
    process.exitCode = 1;
    return;
  }

  migrate();
  const stats = JSON.parse(fs.readFileSync(VOICE_JSON_PATH, "utf8")) as Record<string, VoiceEntry>;
  let updated = 0;
  for (const [urlPath, { bodyWordCount, voiceWordCount }] of Object.entries(stats)) {
    setVoiceStats(urlPath, bodyWordCount, voiceWordCount);
    updated++;
  }

  console.log(`Synced voice-density stats for ${updated} page(s).`);
}

main();
