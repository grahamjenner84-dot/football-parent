// Football DNA review research (10 Nov 2026): DataForSEO Labs keyword
// difficulty (0-100, organic) for the brand and head terms, to sit beside
// Keyword Planner's ad-competition figures. One bulk call, about $0.01.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/football-dna-kd.ts
import fs from "node:fs";
import { migrate } from "../database/migrate";
import { bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const KEYWORDS = [
  "football dna", "football dna app", "football dna review", "football dna cost", "football dna login",
  "the coaching manual", "england football learning", "football session plans", "fa session plan",
  "football coaching app", "best football coaching apps", "football training app", "playing out from the back drills",
  "football training sessions", "football coaching sessions", "coaching u8 soccer drills", "soccer drills u8",
  "football training session plan", "football coaching session plan", "1v1 soccer drills", "fun football training drills",
  "childrens football training drills", "football training drills for 8 year olds", "football session planner app",
];

async function main() {
  migrate();
  if (!(process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes")) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }
  const res = await bulkKeywordDifficulty(KEYWORDS, { workflow: "football-dna-kd", environment: "live", confirmLive: true });
  const items =
    (res.data?.tasks?.[0]?.result as Array<{ items?: Array<{ keyword: string; keyword_difficulty: number | null }> }> | undefined)?.[0]
      ?.items ?? [];
  for (const i of items) console.log(`${i.keyword}|${i.keyword_difficulty ?? "n/a"}`);
  const date = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(`seo-data/exports/football-dna-kd-${date}.json`, JSON.stringify({ cost: res.cost, items }, null, 1));
  console.log(`cost=$${(res.cost ?? 0).toFixed(4)}${res.error ? ` ERROR ${res.error}` : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
