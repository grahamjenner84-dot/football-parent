// Difficulty + real page-one SERP for the round-4 survivor: "what
// qualifications do i need to be a football coach" (vol 70, LOW comp) -
// nearly the exact phrase as the Pitchero blog post that broke into an
// FA-dominated SERP in round 3. Checking if this specific phrasing is
// actually open on page one.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-round4-kd-serp.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";

type DifficultyItem = { keyword: string; keyword_difficulty: number | null };
type SerpItem = { type: string; rank_absolute?: number; domain?: string; title?: string; url?: string };

const KEYWORD = "what qualifications do i need to be a football coach";

async function main() {
  migrate();
  const db = getDb();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;

  const kdResult = await bulkKeywordDifficulty([KEYWORD], { workflow: "coach-round4-kd-serp", environment: "live", confirmLive: true });
  totalCost += kdResult.cost ?? 0;
  let kd: number | null = null;
  if (!kdResult.error && kdResult.data) {
    const kdRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(kdResult.requestHash) as { id: number } | undefined;
    const items = (kdResult.data.tasks?.[0]?.result?.[0] as { items?: DifficultyItem[] } | undefined)?.items ?? [];
    const match = items.find((i) => i.keyword?.toLowerCase() === KEYWORD.toLowerCase());
    kd = match?.keyword_difficulty ?? null;
    if (match) {
      const normalised = KEYWORD.toLowerCase().replace(/\s+/g, " ").trim();
      db.prepare("UPDATE keywords SET kd = ?, updated_at = ? WHERE normalised_keyword = ?").run(kd, nowIso(), normalised);
      const row = db.prepare("SELECT id FROM keywords WHERE normalised_keyword = ?").get(normalised) as { id: number } | undefined;
      if (row) {
        db.prepare(`INSERT INTO keyword_metrics (keyword_id, retrieved_at, keyword_difficulty, is_sandbox, raw_response_id) VALUES (?, ?, ?, 0, ?)`).run(row.id, nowIso(), kd, kdRawRow?.id ?? null);
      }
    }
  }

  const serpResult = await googleOrganicSerp(KEYWORD, { workflow: "coach-round4-kd-serp", environment: "live", confirmLive: true, depth: 10 });
  totalCost += serpResult.cost ?? 0;

  console.log(`=== "${KEYWORD}"  (KD ${kd ?? "n/a"}) ===`);
  console.log(`=== TOTAL ACTUAL COST THIS RUN: $${totalCost.toFixed(4)} ===\n`);
  if (serpResult.error || !serpResult.data) {
    console.log(`SERP failed: ${serpResult.error}`);
    return;
  }
  const items = (serpResult.data.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
  const organic = items.filter((i) => i.type === "organic").slice(0, 10);
  for (const item of organic) {
    console.log(`  #${item.rank_absolute}  ${item.domain}  ${item.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
