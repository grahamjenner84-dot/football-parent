// Sandbox integration test - run with: npx tsx scripts/seo/cli/sandbox-integration-test.ts
// Exercises the client + cache + endpoint wrappers against the real
// sandbox.dataforseo.com hostname (dummy data, free, per DataForSEO's own
// docs) to verify: authentication, base URL switching, request
// construction, response validation, raw-response storage, cache writes,
// cache reads (second identical call must be a cache hit with no new
// network request), and that DATAFORSEO_ALLOW_LIVE=false correctly blocks
// any attempt at a live call. Never contacts api.dataforseo.com.
import { migrate } from "../database/migrate";
import { getDb } from "../database/db";
import { keywordIdeas, relatedKeywords, bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { googleAdsSearchVolume, googleTrendsExplore } from "../dataforseo/endpoints/keywords_data";
import { domainIntersection } from "../dataforseo/endpoints/backlinks";
import { googlePlayAppListingsSearch } from "../dataforseo/endpoints/app_data";
import { dataForSeoRequest, LiveCallRefused } from "../dataforseo/client";
import { getDataForSeoEnvironment, isLiveAllowedByEnv } from "../shared/env";

type TestResult = { name: string; ok: boolean; detail: string };
const results: TestResult[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}: ${detail}`);
}

async function main() {
  console.log(`DataForSEO environment: ${getDataForSeoEnvironment()} (live allowed by env: ${isLiveAllowedByEnv()})`);
  migrate();

  // 1. Labs: keyword_ideas
  const ideas = await keywordIdeas(["football academy trials"], { workflow: "sandbox-test" });
  record(
    "Labs keyword_ideas",
    !ideas.error && ideas.data?.status_code === 20000,
    `status=${ideas.data?.status_code} cacheStatus=${ideas.cacheStatus} resultCount=${ideas.resultCount} cost=${ideas.cost}`
  );

  // 2. Cache hit on identical second request
  const ideasAgain = await keywordIdeas(["football academy trials"], { workflow: "sandbox-test" });
  record(
    "Cache hit on identical repeat request",
    ideasAgain.cacheStatus === "hit" && ideasAgain.requestHash === ideas.requestHash,
    `first hash=${ideas.requestHash.slice(0, 12)} second hash=${ideasAgain.requestHash.slice(0, 12)} second cacheStatus=${ideasAgain.cacheStatus}`
  );

  // 3. Labs: related_keywords
  const related = await relatedKeywords("football academy trials", { workflow: "sandbox-test" });
  record("Labs related_keywords", !related.error, `cacheStatus=${related.cacheStatus} resultCount=${related.resultCount}`);

  // 4. Labs: bulk_keyword_difficulty
  const kd = await bulkKeywordDifficulty(["football academy trials", "grassroots football"], { workflow: "sandbox-test" });
  record("Labs bulk_keyword_difficulty", !kd.error, `cacheStatus=${kd.cacheStatus} resultCount=${kd.resultCount}`);

  // 5. Keywords Data: Google Ads search volume
  const volume = await googleAdsSearchVolume(["football academy trials"], { workflow: "sandbox-test" });
  record("Keywords Data google_ads search_volume", !volume.error, `cacheStatus=${volume.cacheStatus} resultCount=${volume.resultCount}`);

  // 6. Keywords Data: Google Trends explore (task_post/task_get)
  const trends = await googleTrendsExplore(["football academy trials"], { workflow: "sandbox-test" });
  record("Keywords Data google_trends explore (task-based)", !trends.error, `cacheStatus=${trends.cacheStatus} status=${trends.data?.status_code}`);

  // 7. Backlinks: domain_intersection
  const backlinks = await domainIntersection(["footballparent.co.uk", "example-competitor.com"], { workflow: "sandbox-test" });
  record("Backlinks domain_intersection", !backlinks.error, `cacheStatus=${backlinks.cacheStatus} resultCount=${backlinks.resultCount}`);

  // 8. App Data: Google Play listings search
  const appData = await googlePlayAppListingsSearch("football coaching app", { workflow: "sandbox-test" });
  record("App Data google app_listings search", !appData.error, `cacheStatus=${appData.cacheStatus} resultCount=${appData.resultCount}`);

  // 9. Live call must be refused (DATAFORSEO_ALLOW_LIVE=false in this repo's .env.local)
  let refused = false;
  let refusalMessage = "";
  try {
    await dataForSeoRequest({
      workflow: "sandbox-test",
      apiFamily: "dataforseo_labs",
      cacheFamily: "keyword_discovery",
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["should never actually send"], location_code: 2826, language_code: "en" },
      environment: "live",
      confirmLive: true, // even with explicit confirmLive, DATAFORSEO_ALLOW_LIVE=false must still block this
    });
  } catch (err) {
    refused = err instanceof LiveCallRefused;
    refusalMessage = err instanceof Error ? err.message : String(err);
  }
  record("Live call refused while DATAFORSEO_ALLOW_LIVE=false", refused, refusalMessage);

  // 10. No chargeable hostname contacted - check every raw_responses row this run touched
  const db = getDb();
  const rows = db
    .prepare("SELECT DISTINCT environment FROM raw_responses WHERE retrieved_at > datetime('now', '-5 minutes')")
    .all() as { environment: string }[];
  const onlySandbox = rows.every((r) => r.environment === "sandbox");
  record("Every raw response this run is environment=sandbox", onlySandbox, JSON.stringify(rows));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} sandbox integration checks passed.`);
  if (failed.length > 0) {
    console.log("Failures:", failed.map((f) => f.name).join(", "));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
