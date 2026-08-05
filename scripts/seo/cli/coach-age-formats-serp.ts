// Real page-one SERP check for the "youth football age groups and formats"
// cluster (round 2) before committing to write it. KD was already checked
// (all 0-3 or n/a) but KD doesn't tell you who's actually on page one -
// today's FA-cluster checks proved that low KD can still mean a locked
// SERP. Depth 10 only, 5 keywords.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-age-formats-serp.ts
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";

type SerpItem = { type: string; rank_absolute?: number; domain?: string; title?: string };

const KEYWORDS = ["under 9 football rules", "under 10 football rules", "9 a side football formation", "grassroots football rules", "7 a side football formation"];

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  for (const kw of KEYWORDS) {
    const result = await googleOrganicSerp(kw, { workflow: "coach-age-formats-serp", environment: "live", confirmLive: true, depth: 10 });
    totalCost += result.cost ?? 0;
    console.log(`=== "${kw}"  [cost=${result.cost}] ===`);
    if (result.error || !result.data) {
      console.log(`  failed: ${result.error}`);
      continue;
    }
    const items = (result.data.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
    const organic = items.filter((i) => i.type === "organic").slice(0, 10);
    for (const item of organic) {
      console.log(`  #${item.rank_absolute}  ${item.domain}  ${item.title}`);
    }
    console.log("");
  }
  console.log(`=== TOTAL ACTUAL COST THIS RUN: $${totalCost.toFixed(4)} ===`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
