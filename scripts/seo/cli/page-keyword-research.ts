// "Existing article, new terms" research for one page - direct volume
// check for a hand-picked list of candidate phrases, plus a Labs
// keyword_ideas discovery call seeded from the topic to surface genuinely
// new related terms. Two live requests, results persisted and linked to
// the page via page_keywords + discovery_runs/discovery_results.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes \
//     npx tsx scripts/seo/cli/page-keyword-research.ts <pagePath> "<check keyword 1>,<check keyword 2>,..." "<discovery seed 1>,<discovery seed 2>"
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { keywordIdeas } from "../dataforseo/endpoints/labs";
import { upsertKeywordWithMetrics, linkPageKeyword } from "../dataforseo/persist-results";
import { gscSiteOrigin } from "../gsc/client";

type SearchVolumeItem = { keyword: string; search_volume: number | null; cpc: number | null; competition: string | null };
type KeywordIdeaItem = {
  keyword: string;
  keyword_info?: { search_volume?: number | null; cpc?: number | null; competition?: number | null };
  keyword_properties?: { keyword_difficulty?: number | null };
};

async function main() {
  migrate();
  const [, , pagePath, checkArg, discoverArg] = process.argv;
  if (!pagePath || !checkArg) {
    console.error('Usage: page-keyword-research.ts <pagePath> "<check keyword 1>,<check keyword 2>,..." "<discovery seed 1>,<discovery seed 2>"');
    process.exitCode = 1;
    return;
  }

  const pageUrl = pagePath.startsWith("http") ? pagePath : `${gscSiteOrigin()}${pagePath}`;
  const checkKeywords = checkArg.split(",").map((k) => k.trim()).filter(Boolean);
  const discoverySeeds = (discoverArg ?? checkArg).split(",").map((k) => k.trim()).filter(Boolean).slice(0, 3);

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Page: ${pageUrl}`);
  console.log(`Direct volume check (${checkKeywords.length}): ${checkKeywords.join(" | ")}`);
  console.log(`Discovery seeds (${discoverySeeds.length}): ${discoverySeeds.join(" | ")}`);
  if (!liveReady) {
    console.log("\nNot sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const db = getDb();

  // 1. Direct volume check for the hand-picked candidate list.
  const volumeResult = await googleAdsSearchVolume(checkKeywords, { workflow: "seo-page", environment: "live", confirmLive: true });
  console.log(`\nsearch_volume: cacheStatus=${volumeResult.cacheStatus} cost=${volumeResult.cost} error=${volumeResult.error ?? "none"}`);
  if (volumeResult.error || !volumeResult.data) {
    console.error("search_volume request failed:", volumeResult.error);
  } else {
    const volRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(volumeResult.requestHash) as { id: number } | undefined;
    const items = (volumeResult.data.tasks?.[0]?.result ?? []) as SearchVolumeItem[];
    for (const item of items) {
      if (!item.keyword) continue;
      const keywordId = upsertKeywordWithMetrics({
        keyword: item.keyword,
        volume: item.search_volume ?? null,
        cpc: item.cpc ?? null,
        competition: item.competition ?? null,
        source: "dataforseo_live",
        targetUrl: pageUrl,
        isSandbox: false,
        rawResponseId: volRawRow?.id ?? null,
      });
      linkPageKeyword(pageUrl, keywordId, "opportunity");
      console.log(`  ${String(item.search_volume ?? "null").padStart(6)}  ${item.keyword}`);
    }
  }

  // 2. Discovery - genuinely new related terms, not just our own guesses.
  const ideasResult = await keywordIdeas(discoverySeeds, { workflow: "seo-page", environment: "live", confirmLive: true, limit: 50 });
  console.log(`\nkeyword_ideas: cacheStatus=${ideasResult.cacheStatus} cost=${ideasResult.cost} error=${ideasResult.error ?? "none"}`);
  if (ideasResult.error || !ideasResult.data) {
    console.error("keyword_ideas request failed:", ideasResult.error);
    return;
  }

  const ideasRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(ideasResult.requestHash) as { id: number } | undefined;
  const ideaItems = ((ideasResult.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: KeywordIdeaItem[] } | undefined)?.items ?? [];
  console.log(`Discovered ${ideaItems.length} related keyword ideas.`);

  const discoveryRunResult = db
    .prepare(
      `INSERT INTO discovery_runs (run_type, page_id, endpoint, seed_terms, location_code, language_code, result_limit, environment, is_sandbox, request_hash, created_at)
       VALUES ('existing_article', (SELECT id FROM pages WHERE url = ?), ?, ?, 2826, 'en', 50, 'live', 0, ?, ?)`
    )
    .run(pageUrl, "dataforseo_labs/google/keyword_ideas/live", JSON.stringify(discoverySeeds), ideasResult.requestHash, nowIso());
  const discoveryRunId = Number(discoveryRunResult.lastInsertRowid);

  const insertDiscoveryResult = db.prepare(
    "INSERT INTO discovery_results (discovery_run_id, keyword_id, relevance_flag, created_at) VALUES (?, ?, 'review', ?) ON CONFLICT(discovery_run_id, keyword_id) DO NOTHING"
  );

  const sortedIdeas = [...ideaItems].sort((a, b) => (b.keyword_info?.search_volume ?? 0) - (a.keyword_info?.search_volume ?? 0));
  for (const item of sortedIdeas) {
    if (!item.keyword) continue;
    const keywordId = upsertKeywordWithMetrics({
      keyword: item.keyword,
      volume: item.keyword_info?.search_volume ?? null,
      cpc: item.keyword_info?.cpc ?? null,
      competition: item.keyword_info?.competition ?? null,
      keywordDifficulty: item.keyword_properties?.keyword_difficulty ?? null,
      source: "dataforseo_live",
      isSandbox: false,
      rawResponseId: ideasRawRow?.id ?? null,
    });
    insertDiscoveryResult.run(discoveryRunId, keywordId, nowIso());
  }

  console.log("\nTop discovered ideas by volume:");
  for (const item of sortedIdeas.slice(0, 30)) {
    console.log(`  ${String(item.keyword_info?.search_volume ?? "null").padStart(6)}  ${item.keyword}  (KD ${item.keyword_properties?.keyword_difficulty ?? "n/a"})`);
  }

  console.log(`\nTotal cost this run: $${(volumeResult.cost ?? 0) + (ideasResult.cost ?? 0)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
