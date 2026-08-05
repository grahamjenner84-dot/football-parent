// Difficulty + real page-one SERPs for the round-2/round-3 survivors that
// haven't been checked yet: football coaching badges (round 2), fa level 2
// coaching course, fa level 1 coaching course online, fa level 2 in
// coaching football (round 3). SERP depth 10 only (page one, cheap).
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-round3-kd-serp.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";

type DifficultyItem = { keyword: string; keyword_difficulty: number | null };
type SerpItem = { type: string; rank_absolute?: number; domain?: string; title?: string; url?: string };

const KEYWORDS = ["football coaching badges", "fa level 2 coaching course", "fa level 1 coaching course online", "fa level 2 in coaching football"];

async function main() {
  migrate();
  const db = getDb();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;

  const kdResult = await bulkKeywordDifficulty(KEYWORDS, { workflow: "coach-round3-kd-serp", environment: "live", confirmLive: true });
  console.log(`[bulk_keyword_difficulty] cacheStatus=${kdResult.cacheStatus} cost=${kdResult.cost} error=${kdResult.error ?? "none"}`);
  totalCost += kdResult.cost ?? 0;
  const kdMap = new Map<string, number | null>();
  if (!kdResult.error && kdResult.data) {
    const kdRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(kdResult.requestHash) as { id: number } | undefined;
    const items = (kdResult.data.tasks?.[0]?.result?.[0] as { items?: DifficultyItem[] } | undefined)?.items ?? [];
    const upsertKd = db.prepare("UPDATE keywords SET kd = ?, updated_at = ? WHERE normalised_keyword = ?");
    const getKeywordId = db.prepare("SELECT id FROM keywords WHERE normalised_keyword = ?");
    const insertMetric = db.prepare(`INSERT INTO keyword_metrics (keyword_id, retrieved_at, keyword_difficulty, is_sandbox, raw_response_id) VALUES (?, ?, ?, 0, ?)`);
    for (const item of items) {
      if (!item.keyword) continue;
      kdMap.set(item.keyword.toLowerCase(), item.keyword_difficulty);
      const normalised = item.keyword.toLowerCase().replace(/\s+/g, " ").trim().replace(/^[^\w]+|[^\w]+$/g, (m) => m.replace(/['-]/g, ""));
      upsertKd.run(item.keyword_difficulty, nowIso(), normalised);
      const row = getKeywordId.get(normalised) as { id: number } | undefined;
      if (row) insertMetric.run(row.id, nowIso(), item.keyword_difficulty, kdRawRow?.id ?? null);
    }
  }

  console.log("");
  for (const kw of KEYWORDS) {
    const serpResult = await googleOrganicSerp(kw, { workflow: "coach-round3-kd-serp", environment: "live", confirmLive: true, depth: 10 });
    totalCost += serpResult.cost ?? 0;
    console.log(`=== "${kw}"  (KD ${kdMap.get(kw.toLowerCase()) ?? "n/a"})  [serp cost=${serpResult.cost}] ===`);
    if (serpResult.error || !serpResult.data) {
      console.log(`  SERP failed: ${serpResult.error}`);
      continue;
    }
    const items = (serpResult.data.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
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
