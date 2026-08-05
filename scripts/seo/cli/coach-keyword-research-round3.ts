// Round 3: adjacent "worth it" / level-1-vs-level-2 content angles around
// the FA coaching course cluster, since round 2's SERP check showed the
// literal course-name query is FA-owned - these are the content types that
// might actually be winnable instead. Volume-only pass first.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-keyword-research-round3.ts
import { migrate } from "../database/migrate";
import { getDb } from "../database/db";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { upsertKeywordWithMetrics } from "../dataforseo/persist-results";

type SearchVolumeItem = { keyword: string; search_volume: number | null; cpc: number | null; competition: string | null };

const KEYWORDS = [
  "is fa level 1 worth it",
  "fa level 1 coaching course worth it",
  "do i need a coaching badge for grassroots football",
  "fa level 2 coaching course",
  "fa level 2 in coaching football",
  "fa level 1 vs level 2 coaching",
  "what happens on fa level 1 course",
  "how long does fa level 1 course take",
  "fa level 1 coaching course online",
  "fa level 2 coaching course cost",
];

async function main() {
  migrate();
  const db = getDb();

  console.log(`Seed keywords: ${KEYWORDS.length}`);
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const volResult = await googleAdsSearchVolume(KEYWORDS, { workflow: "coach-keyword-research-round3", environment: "live", confirmLive: true });
  console.log(`\n[search_volume] cacheStatus=${volResult.cacheStatus} cost=${volResult.cost} error=${volResult.error ?? "none"}`);
  if (volResult.error || !volResult.data) {
    console.error("failed:", volResult.error);
    process.exitCode = 1;
    return;
  }

  const volRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(volResult.requestHash) as { id: number } | undefined;
  const items = (volResult.data.tasks?.[0]?.result ?? []) as SearchVolumeItem[];
  const byKeyword = new Map(items.map((i) => [i.keyword.toLowerCase(), i]));

  console.log(`\n=== TOTAL ACTUAL COST THIS RUN: $${(volResult.cost ?? 0).toFixed(4)} ===\n`);
  for (const k of KEYWORDS) {
    const v = byKeyword.get(k.toLowerCase());
    upsertKeywordWithMetrics({
      keyword: k,
      volume: v?.search_volume ?? null,
      cpc: v?.cpc ?? null,
      competition: v?.competition ?? null,
      source: "dataforseo_live",
      isSandbox: false,
      rawResponseId: volRawRow?.id ?? null,
    });
    console.log(`  vol ${String(v?.search_volume ?? "null").padStart(6)}  comp ${String(v?.competition ?? "-").padEnd(6)}  cpc ${String(v?.cpc ?? "-").padStart(6)}  ${k}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
