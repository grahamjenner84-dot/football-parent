// The live smoke test, generalised into a reusable "populate real Google
// Ads search volume for our own site's target keywords" command - the
// user's own site content is the keyword list (one candidate keyword per
// article, from scripts/seo/dataforseo/site-keywords.ts), sent as a single
// batched request since this endpoint is priced per request, not per
// keyword ($0.09 flat for 1-1000 keywords, confirmed against
// dataforseo.com/pricing).
//
// SAFETY: this only ever goes live if ALL of the following are true at
// once, none of which this script can set for itself:
//   1. DATAFORSEO_ENV=live in the environment (not read from .env.local by
//      default - pass it inline on the command line for one invocation)
//   2. DATAFORSEO_ALLOW_LIVE=true in the environment, same way
//   3. LIVE_CONFIRM=yes in the environment - a fourth, separate flag
//      specific to this script, so that even a stray future
//      `DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true npx tsx
//      live-search-volume.ts` (e.g. copy-pasted from history) still won't
//      go live without deliberately adding LIVE_CONFIRM=yes too.
// Run (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/live-search-volume.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { getSiteArticleKeywords } from "../dataforseo/site-keywords";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { keywordIdentity } from "../shared/normalise";
import { upsertPage } from "../gsc/persist";

type SearchVolumeResultItem = {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: string | null;
  competition_index: number | null;
  monthly_searches?: { year: number; month: number; search_volume: number }[];
};

function normaliseForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function main() {
  migrate();
  const db = getDb();

  const articles = getSiteArticleKeywords();
  const seen = new Set<string>();
  const uniqueArticles = articles.filter((a) => {
    const key = normaliseForMatch(a.keyword);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Site articles: ${articles.length}, unique candidate keywords: ${uniqueArticles.length}`);

  // Always seed/refresh the pages table from real site content, regardless
  // of whether the live call is authorised - this part is free and local.
  for (const a of articles) {
    upsertPage(a.url);
    db.prepare(
      `UPDATE pages SET article = COALESCE(article, ?), category = COALESCE(category, ?), primary_keyword = COALESCE(primary_keyword, ?), updated_at = ? WHERE url = ?`
    ).run(a.rawTitle, a.category, a.keyword, nowIso(), a.url);
  }
  console.log(`Seeded/updated ${articles.length} pages rows from site content.`);

  const keywords = uniqueArticles.map((a) => a.keyword);
  console.log(`\nRequesting Google Ads search volume for ${keywords.length} keywords (UK/English, one batched request):`);
  for (const k of keywords) console.log(`  - ${k}`);

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log(
      "\nNot sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation. Pages table was still seeded above."
    );
    return;
  }

  const result = await googleAdsSearchVolume(keywords, { workflow: "live-search-volume", environment: "live", confirmLive: true });
  console.log(`\nFirst call: cacheStatus=${result.cacheStatus} cost=${result.cost} resultCount=${result.resultCount} error=${result.error ?? "none"}`);

  if (result.error || !result.data) {
    console.error("Request failed, nothing persisted:", result.error);
    process.exitCode = 1;
    return;
  }

  // Prove the cache actually works for this real live request too - an
  // identical repeat must be free (served from cache_records, no second
  // charge).
  const repeat = await googleAdsSearchVolume(keywords, { workflow: "live-search-volume", environment: "live", confirmLive: true });
  console.log(`Repeat call (must be a cache hit, $0 additional cost): cacheStatus=${repeat.cacheStatus} cost=${repeat.cost}`);

  const rawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(result.requestHash) as { id: number } | undefined;
  const items = (result.data.tasks?.[0]?.result ?? []) as SearchVolumeResultItem[];

  const byNormalisedTitle = new Map(uniqueArticles.map((a) => [normaliseForMatch(a.keyword), a]));

  let matched = 0;
  let zeroVolume = 0;
  const upsertKeyword = db.prepare(
    `INSERT INTO keywords (keyword, normalised_keyword, search_engine, location_code, language_code, volume, source, target_url, mapped_article, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(normalised_keyword, search_engine, location_code, language_code) DO UPDATE SET
       volume = excluded.volume, source = excluded.source, target_url = excluded.target_url,
       mapped_article = excluded.mapped_article, updated_at = excluded.updated_at`
  );
  const getKeywordId = db.prepare(
    "SELECT id FROM keywords WHERE normalised_keyword = ? AND search_engine = ? AND location_code = ? AND language_code = ?"
  );
  const insertMetric = db.prepare(
    `INSERT INTO keyword_metrics (keyword_id, retrieved_at, search_volume, cpc, competition, is_sandbox, raw_response_id)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  );
  const insertMonthly = db.prepare(
    `INSERT INTO monthly_search_history (keyword_id, year, month, search_volume, is_sandbox, raw_response_id, retrieved_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)
     ON CONFLICT(keyword_id, year, month, is_sandbox) DO UPDATE SET search_volume = excluded.search_volume, retrieved_at = excluded.retrieved_at`
  );

  for (const item of items) {
    if (!item.keyword) continue;
    const article = byNormalisedTitle.get(normaliseForMatch(item.keyword));
    const identity = keywordIdentity(item.keyword);
    const now = nowIso();

    upsertKeyword.run(
      item.keyword,
      identity.normalisedKeyword,
      identity.searchEngine,
      identity.locationCode,
      identity.languageCode,
      item.search_volume ?? null,
      "dataforseo_live",
      article?.url ?? null,
      article?.rawTitle ?? null,
      now,
      now
    );
    const keywordId = (
      getKeywordId.get(identity.normalisedKeyword, identity.searchEngine, identity.locationCode, identity.languageCode) as { id: number }
    ).id;

    insertMetric.run(keywordId, now, item.search_volume ?? null, item.cpc ?? null, item.competition ?? null, rawRow?.id ?? null);

    for (const m of item.monthly_searches ?? []) {
      insertMonthly.run(keywordId, m.year, m.month, m.search_volume, rawRow?.id ?? null, now);
    }

    if (article) matched++;
    if ((item.search_volume ?? 0) === 0) zeroVolume++;
  }

  console.log(`\nPersisted ${items.length} keyword volume rows (${matched} matched back to a specific article, ${zeroVolume} with zero recorded UK volume).`);
  console.log(`Actual API-reported cost: $${result.cost}. Raw response saved at: ${result.rawResponsePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
