// Real SERP position for every core site keyword - unlike GSC's position
// figures (only reported when there's been at least one impression), this
// tells us where we actually rank even for pages GSC has nothing to say
// about. One live request per keyword (SERP can't be batched like
// search_volume) - see scripts/seo/dataforseo/endpoints/serp.ts.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes \
//     npx tsx scripts/seo/cli/site-serp-check.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { getSiteArticleKeywords } from "../dataforseo/site-keywords";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { keywordIdentity } from "../shared/normalise";

const TARGET_DOMAIN = "footballparent.co.uk";
const DEPTH = 100;

type OrganicItem = { type: string; rank_group?: number; rank_absolute?: number; domain?: string; url?: string };

function isOurDomain(domain: string | undefined): boolean {
  if (!domain) return false;
  return domain.replace(/^www\./, "").toLowerCase() === TARGET_DOMAIN;
}

async function main() {
  migrate();
  const db = getDb();

  const articles = getSiteArticleKeywords();
  const seen = new Set<string>();
  const allKeywords = articles.filter((a) => {
    const key = a.keyword.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Optional: restrict to specific pages by slug, e.g. when the full-site
  // run is more than the available budget covers.
  const slugFilter = process.argv.slice(2);
  const keywords = slugFilter.length > 0 ? allKeywords.filter((a) => slugFilter.includes(a.slug)) : allKeywords;

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`${keywords.length} core keywords, SERP depth ${DEPTH}, estimated ~$${(keywords.length * 0.02).toFixed(2)}`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const insertCheck = db.prepare(
    `INSERT INTO serp_rank_checks (keyword_id, keyword, target_domain, rank_group, rank_absolute, ranking_url, checked_depth, environment, is_sandbox, raw_response_id, retrieved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let totalCost = 0;
  const results: { keyword: string; rank: number | null; url: string | null; page: string | null }[] = [];

  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    const result = await googleOrganicSerp(kw.keyword, { workflow: "site-serp-check", environment: "live", confirmLive: true, depth: DEPTH });
    totalCost += result.cost ?? 0;

    if (result.error || !result.data) {
      console.log(`[${i + 1}/${keywords.length}] ERROR "${kw.keyword}": ${result.error}`);
      continue;
    }

    const items = ((result.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: OrganicItem[] } | undefined)?.items ?? [];
    const ourResult = items.find((it) => it.type === "organic" && isOurDomain(it.domain));

    const identity = keywordIdentity(kw.keyword);
    const keywordRow = db
      .prepare("SELECT id FROM keywords WHERE normalised_keyword = ? AND search_engine = ? AND location_code = ? AND language_code = ?")
      .get(identity.normalisedKeyword, identity.searchEngine, identity.locationCode, identity.languageCode) as { id: number } | undefined;

    const rawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(result.requestHash) as { id: number } | undefined;

    insertCheck.run(
      keywordRow?.id ?? null,
      kw.keyword,
      TARGET_DOMAIN,
      ourResult?.rank_group ?? null,
      ourResult?.rank_absolute ?? null,
      ourResult?.url ?? null,
      DEPTH,
      "live",
      0,
      rawRow?.id ?? null,
      nowIso()
    );

    results.push({ keyword: kw.keyword, rank: ourResult?.rank_absolute ?? null, url: ourResult?.url ?? null, page: kw.url });
    console.log(`[${i + 1}/${keywords.length}] "${kw.keyword}" -> ${ourResult ? `rank ${ourResult.rank_absolute}` : `not in top ${DEPTH}`} (cost so far: $${totalCost.toFixed(3)})`);
  }

  console.log(`\n=== Ranked (best first) ===`);
  for (const r of results.filter((r) => r.rank !== null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))) {
    console.log(`  #${r.rank}  ${r.keyword}  ${r.url}`);
  }

  console.log(`\n=== Not ranking in top ${DEPTH} at all (${results.filter((r) => r.rank === null).length}) ===`);
  for (const r of results.filter((r) => r.rank === null)) {
    console.log(`  ${r.keyword}  ->  ${r.page}`);
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
