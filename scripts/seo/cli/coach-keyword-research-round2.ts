// Round 2 of coach-content keyword research: broader/more concrete phrasing
// than round 1 (which mostly returned null volume - see
// coach-keyword-research.ts). Volume-only this time, one batched call - no
// keyword_ideas, since round 1 showed that endpoint returns off-topic junk
// for this niche and isn't worth the spend.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-keyword-research-round2.ts
import { migrate } from "../database/migrate";
import { getDb } from "../database/db";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { upsertKeywordWithMetrics } from "../dataforseo/persist-results";

type SearchVolumeItem = { keyword: string; search_volume: number | null; cpc: number | null; competition: string | null };

const CLUSTERS: Record<string, string[]> = {
  "coaching_qualifications": [
    "fa level 1 coaching course",
    "how to become a grassroots football coach",
    "football coaching badges",
    "fa coaching course cost",
    "youth football coaching qualifications",
  ],
  "age_group_formats": [
    "under 9 football rules",
    "under 10 football rules",
    "7 a side football formation",
    "9 a side football formation",
    "how many players in a football team",
  ],
  "drills_sessions": [
    "football drills for kids",
    "football warm up games for kids",
    "fun football drills for beginners",
    "football session plans",
  ],
  "game_time_retry": [
    "rolling substitutions football",
    "youth football substitution rules",
    "grassroots football rules",
  ],
  "team_admin_retry": [
    "how to organise a football team",
    "sunday league team management",
    "starting a junior football team",
  ],
  "coaching_own_child": [
    "how to coach my sons football team",
    "how to coach your own child's football team",
    "accused of favouritism football coach",
    "how to avoid favouritism coaching your own child",
    "coaching your own kid in sport advice",
  ],
};

async function main() {
  migrate();
  const db = getDb();

  const allSeeds = Object.values(CLUSTERS).flat();
  console.log(`Seed keywords: ${allSeeds.length} across ${Object.keys(CLUSTERS).length} clusters.`);

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const volResult = await googleAdsSearchVolume(allSeeds, { workflow: "coach-keyword-research-round2", environment: "live", confirmLive: true });
  console.log(`\n[search_volume] cacheStatus=${volResult.cacheStatus} cost=${volResult.cost} error=${volResult.error ?? "none"}`);
  if (volResult.error || !volResult.data) {
    console.error("search_volume failed:", volResult.error);
    process.exitCode = 1;
    return;
  }

  const volRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(volResult.requestHash) as { id: number } | undefined;
  const volItems = (volResult.data.tasks?.[0]?.result ?? []) as SearchVolumeItem[];
  const volByKeyword = new Map(volItems.map((i) => [i.keyword.toLowerCase(), i]));

  const report: { cluster: string; keyword: string; volume: number | null; cpc: number | null; competition: string | null }[] = [];
  for (const [cluster, seeds] of Object.entries(CLUSTERS)) {
    for (const seed of seeds) {
      const v = volByKeyword.get(seed.toLowerCase());
      report.push({ cluster, keyword: seed, volume: v?.search_volume ?? null, cpc: v?.cpc ?? null, competition: v?.competition ?? null });
      upsertKeywordWithMetrics({
        keyword: seed,
        volume: v?.search_volume ?? null,
        cpc: v?.cpc ?? null,
        competition: v?.competition ?? null,
        source: "dataforseo_live",
        isSandbox: false,
        rawResponseId: volRawRow?.id ?? null,
      });
    }
  }

  console.log(`\n=== TOTAL ACTUAL COST THIS RUN: $${(volResult.cost ?? 0).toFixed(4)} ===\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
