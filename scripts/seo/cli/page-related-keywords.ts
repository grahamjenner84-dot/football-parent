// Tighter alternative to keyword_ideas for one page: Labs related_keywords
// takes a single seed and traverses Google's own "related searches" tree,
// which stays on-topic far better than keyword_ideas' broad-match
// expansion (see scripts/seo/cli/page-keyword-research.ts - seeded with
// "football parent mistakes" it returned live scores and footballer names).
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes \
//     npx tsx scripts/seo/cli/page-related-keywords.ts <pagePath> "<seed keyword>"
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { relatedKeywords } from "../dataforseo/endpoints/labs";
import { upsertKeywordWithMetrics } from "../dataforseo/persist-results";
import { gscSiteOrigin } from "../gsc/client";

type RelatedKeywordItem = {
  keyword_data?: {
    keyword?: string;
    keyword_info?: { search_volume?: number | null; cpc?: number | null; competition?: number | null };
    keyword_properties?: { keyword_difficulty?: number | null };
  };
};

async function main() {
  migrate();
  const [, , pagePath, seed] = process.argv;
  if (!pagePath || !seed) {
    console.error('Usage: page-related-keywords.ts <pagePath> "<seed keyword>"');
    process.exitCode = 1;
    return;
  }
  const pageUrl = pagePath.startsWith("http") ? pagePath : `${gscSiteOrigin()}${pagePath}`;

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Page: ${pageUrl}`);
  console.log(`Seed: "${seed}"`);
  if (!liveReady) {
    console.log("\nNot sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const db = getDb();
  const result = await relatedKeywords(seed, { workflow: "seo-page", environment: "live", confirmLive: true, limit: 50 });
  console.log(`\nrelated_keywords: cacheStatus=${result.cacheStatus} cost=${result.cost} error=${result.error ?? "none"}`);
  if (result.error || !result.data) {
    console.error("related_keywords request failed:", result.error);
    return;
  }

  const rawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(result.requestHash) as { id: number } | undefined;
  const items = ((result.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: RelatedKeywordItem[] } | undefined)?.items ?? [];
  console.log(`Discovered ${items.length} related keywords.`);

  const discoveryRunResult = db
    .prepare(
      `INSERT INTO discovery_runs (run_type, page_id, endpoint, seed_terms, location_code, language_code, result_limit, environment, is_sandbox, request_hash, created_at)
       VALUES ('existing_article', (SELECT id FROM pages WHERE url = ?), ?, ?, 2826, 'en', 50, 'live', 0, ?, ?)`
    )
    .run(pageUrl, "dataforseo_labs/google/related_keywords/live", JSON.stringify([seed]), result.requestHash, nowIso());
  const discoveryRunId = Number(discoveryRunResult.lastInsertRowid);
  const insertDiscoveryResult = db.prepare(
    "INSERT INTO discovery_results (discovery_run_id, keyword_id, relevance_flag, created_at) VALUES (?, ?, 'review', ?) ON CONFLICT(discovery_run_id, keyword_id) DO NOTHING"
  );

  const parsed = items
    .map((item) => ({
      keyword: item.keyword_data?.keyword ?? "",
      volume: item.keyword_data?.keyword_info?.search_volume ?? null,
      cpc: item.keyword_data?.keyword_info?.cpc ?? null,
      competition: item.keyword_data?.keyword_info?.competition ?? null,
      kd: item.keyword_data?.keyword_properties?.keyword_difficulty ?? null,
    }))
    .filter((i) => i.keyword)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

  for (const item of parsed) {
    const keywordId = upsertKeywordWithMetrics({
      keyword: item.keyword,
      volume: item.volume,
      cpc: item.cpc,
      competition: item.competition,
      keywordDifficulty: item.kd,
      source: "dataforseo_live",
      isSandbox: false,
      rawResponseId: rawRow?.id ?? null,
    });
    insertDiscoveryResult.run(discoveryRunId, keywordId, nowIso());
  }

  console.log("\nAll discovered related keywords by volume:");
  for (const item of parsed) {
    console.log(`  ${String(item.volume ?? "null").padStart(6)}  ${item.keyword}  (KD ${item.kd ?? "n/a"})`);
  }
  console.log(`\nCost this run: $${result.cost}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
