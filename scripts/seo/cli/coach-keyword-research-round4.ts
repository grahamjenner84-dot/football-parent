// Round 4: "do I need to be qualified" framing - following the Pitchero
// SERP signal from round 3 (their advice-style "what qualifications do I
// need" post broke into an FA-dominated SERP where nothing else did).
// Volume-only pass first.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-keyword-research-round4.ts
import { migrate } from "../database/migrate";
import { getDb } from "../database/db";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { upsertKeywordWithMetrics } from "../dataforseo/persist-results";

type SearchVolumeItem = { keyword: string; search_volume: number | null; cpc: number | null; competition: string | null };

const KEYWORDS = [
  "what qualifications do i need to be a football coach",
  "do you need a coaching badge to coach grassroots football",
  "what level do i need to coach grassroots football",
  "do i need to be qualified to coach kids football",
  "do i need qualifications to coach my kids football",
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

  const volResult = await googleAdsSearchVolume(KEYWORDS, { workflow: "coach-keyword-research-round4", environment: "live", confirmLive: true });
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
