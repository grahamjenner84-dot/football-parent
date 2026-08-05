// Keyword difficulty for the 14 round-2 seeds that returned real volume.
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-keyword-research-round2-kd.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";

type DifficultyItem = { keyword: string; keyword_difficulty: number | null };

const KEYWORDS = [
  "fa level 1 coaching course",
  "how many players in a football team",
  "football coaching badges",
  "football session plans",
  "under 9 football rules",
  "under 10 football rules",
  "9 a side football formation",
  "grassroots football rules",
  "7 a side football formation",
  "how to become a grassroots football coach",
  "fun football drills for beginners",
  "rolling substitutions football",
  "youth football coaching qualifications",
  "starting a junior football team",
];

async function main() {
  migrate();
  const db = getDb();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Requesting difficulty for ${KEYWORDS.length} keywords.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const kdResult = await bulkKeywordDifficulty(KEYWORDS, { workflow: "coach-keyword-research-round2-kd", environment: "live", confirmLive: true });
  console.log(`[bulk_keyword_difficulty] cacheStatus=${kdResult.cacheStatus} cost=${kdResult.cost} error=${kdResult.error ?? "none"}`);
  if (kdResult.error || !kdResult.data) {
    console.error("failed:", kdResult.error);
    process.exitCode = 1;
    return;
  }

  const kdRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(kdResult.requestHash) as { id: number } | undefined;
  const items = (kdResult.data.tasks?.[0]?.result?.[0] as { items?: DifficultyItem[] } | undefined)?.items ?? [];
  const byKeyword = new Map(items.filter((i) => i.keyword).map((i) => [i.keyword.toLowerCase(), i.keyword_difficulty]));

  const upsertKd = db.prepare("UPDATE keywords SET kd = ?, updated_at = ? WHERE normalised_keyword = ?");
  const insertMetric = db.prepare(
    `INSERT INTO keyword_metrics (keyword_id, retrieved_at, keyword_difficulty, is_sandbox, raw_response_id) VALUES (?, ?, ?, 0, ?)`
  );
  const getKeywordId = db.prepare("SELECT id FROM keywords WHERE normalised_keyword = ?");

  console.log(`\n=== TOTAL ACTUAL COST THIS RUN: $${(kdResult.cost ?? 0).toFixed(4)} ===\n`);
  for (const k of KEYWORDS) {
    const kd = byKeyword.get(k.toLowerCase());
    const normalised = k.toLowerCase().replace(/\s+/g, " ").trim().replace(/^[^\w]+|[^\w]+$/g, (m) => m.replace(/['-]/g, ""));
    if (kd !== undefined) {
      upsertKd.run(kd, nowIso(), normalised);
      const row = getKeywordId.get(normalised) as { id: number } | undefined;
      if (row) insertMetric.run(row.id, nowIso(), kd, kdRawRow?.id ?? null);
    }
    console.log(`  KD ${String(kd ?? "n/a").padStart(4)}  ${k}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
