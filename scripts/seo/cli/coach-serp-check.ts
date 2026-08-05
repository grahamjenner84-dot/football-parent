// Real page-one SERP check for "fa level 1 coaching course" - the round-2
// standout keyword (volume 2900, KD 10). Checking who's actually on page
// one before treating a low KD score as "winnable" - a low backlink-based
// difficulty score doesn't tell you if the FA's own site occupies the spot.
// Depth 10 only (page one), not the default depth 100, to keep this cheap.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-serp-check.ts
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";

type SerpItem = {
  type: string;
  rank_group?: number;
  rank_absolute?: number;
  domain?: string;
  title?: string;
  url?: string;
};

const KEYWORD = "fa level 1 coaching course";

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`SERP check: "${KEYWORD}" (depth 10, UK/en)`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const result = await googleOrganicSerp(KEYWORD, { workflow: "coach-serp-check", environment: "live", confirmLive: true, depth: 10 });
  console.log(`[serp] cacheStatus=${result.cacheStatus} cost=${result.cost} error=${result.error ?? "none"}`);
  if (result.error || !result.data) {
    console.error("failed:", result.error);
    process.exitCode = 1;
    return;
  }

  console.log(`\n=== TOTAL ACTUAL COST THIS RUN: $${(result.cost ?? 0).toFixed(4)} ===\n`);

  const items = (result.data.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
  const organic = items.filter((i) => i.type === "organic");
  for (const item of organic) {
    console.log(`  #${item.rank_absolute}  ${item.domain}  ${item.title}`);
    console.log(`      ${item.url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
