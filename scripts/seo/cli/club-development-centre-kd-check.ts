// Bulk keyword difficulty for the shortlisted club-development-centre
// candidate keywords (the same 11 primary phrasings checked in
// club-development-centre-serp-check.ts), per the /seo-content workflow's
// "enrich only the shortlist" step. One batched request, not per-keyword.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/club-development-centre-kd-check.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { keywordIdentity } from "../shared/normalise";
import { ensureEnvLoaded } from "../shared/env";

const KEYWORDS = [
  "Leeds United youth academy",
  "Brentford academy trials",
  "Aston Villa academy trials",
  "Watford academy trials",
  "Manchester United academy trials",
  "Charlton Athletic academy trials",
  "Coventry City academy trials",
  "Millwall academy trials",
  "Southampton academy trials",
  "Manchester City youth academy",
  "Wrexham academy trials",
];

type KdResultItem = { keyword: string; keyword_difficulty: number | null };

function normaliseForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function main() {
  ensureEnvLoaded();
  migrate();
  const db = getDb();

  console.log(`Requesting bulk keyword difficulty for ${KEYWORDS.length} shortlisted keywords (one batched request).`);

  const liveReady = process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires LIVE_CONFIRM=yes for this invocation.");
    return;
  }

  const result = await bulkKeywordDifficulty(KEYWORDS, {
    workflow: "club-development-centre-kd-check",
    environment: "live",
    confirmLive: true,
  });
  console.log(`\nCall: cacheStatus=${result.cacheStatus} cost=${result.cost} resultCount=${result.resultCount} error=${result.error ?? "none"}`);

  if (result.error || !result.data) {
    console.error("Request failed:", result.error);
    process.exitCode = 1;
    return;
  }

  const items = (result.data.tasks?.[0]?.result?.[0] as { items?: KdResultItem[] } | undefined)?.items ?? [];

  const updateKd = db.prepare(
    `UPDATE keywords SET kd = ?, updated_at = ? WHERE normalised_keyword = ? AND search_engine = ? AND location_code = ? AND language_code = ?`
  );

  console.log("\n--- Keyword difficulty (0-100, higher = harder) ---");
  for (const item of items) {
    if (!item.keyword) continue;
    console.log(`${item.keyword}: KD ${item.keyword_difficulty ?? "n/a"}`);
    const identity = keywordIdentity(item.keyword);
    updateKd.run(item.keyword_difficulty ?? null, nowIso(), identity.normalisedKeyword, identity.searchEngine, identity.locationCode, identity.languageCode);
  }

  console.log(`\nActual API-reported cost: $${result.cost}.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
