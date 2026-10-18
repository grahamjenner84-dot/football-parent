// How strong are the seven Football DNA blog posts we're asking for links
// from (mutual-promotion deal, Oct 2026)? For each post: the keywords it
// ranks for in Google UK (ranked_keywords with the page URL as target) and
// its page rank (bulk_ranks), plus domain scale for footballdna.co.uk and,
// for comparison, footballparent.co.uk.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/footballdna-post-rankings.ts
import { migrate } from "../database/migrate";
import { domainRankOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { bulkRanks } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const POSTS = [
  "https://footballdna.co.uk/mastering-equal-playtime/",
  "https://footballdna.co.uk/how-technology-supports-better-coaching-decisions-a-football-coaches-guide/",
  "https://footballdna.co.uk/common-coaching-mistakes-in-under-8-football-and-how-to-fix-them/",
  "https://footballdna.co.uk/how-to-structure-a-complete-u8-football-training-session-warm-up-to-game/",
  "https://footballdna.co.uk/common-challenges-for-grassroots-coaches/",
  "https://footballdna.co.uk/what-do-scouts-want-from-a-footballer/",
  "https://footballdna.co.uk/youth-football-coaching-development-over-results/",
];
const DOMAINS = ["footballdna.co.uk", "footballparent.co.uk"];

type RankedRow = {
  keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number } };
  ranked_serp_element?: { serp_item?: { etv?: number; rank_absolute?: number } };
};

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: ${DOMAINS.length} domain_rank_overview + ${POSTS.length} ranked_keywords (limit 100) + 1 bulk_ranks call. Rough estimated cost: ~$1.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "footballdna-post-rankings", environment: "live" as const, confirmLive: true };

  for (const domain of DOMAINS) {
    const overview = await domainRankOverview(domain, common);
    totalCost += overview.cost ?? 0;
    const items = (overview.data?.tasks?.[0]?.result as Array<{ items?: Array<{ metrics?: { organic?: { count?: number; etv?: number; pos_1?: number; pos_2_3?: number; pos_4_10?: number } } }> }> | undefined) ?? [];
    const m = items[0]?.items?.[0]?.metrics?.organic;
    console.log(
      `${domain}: ranked keywords=${m?.count ?? "n/a"}, etv=${m?.etv?.toFixed?.(0) ?? "n/a"}, pos1=${m?.pos_1 ?? "n/a"}, pos2-3=${m?.pos_2_3 ?? "n/a"}, pos4-10=${m?.pos_4_10 ?? "n/a"}${overview.error ? ` ERROR ${overview.error}` : ""}`
    );
  }

  const ranks = await bulkRanks([...POSTS, ...DOMAINS], common);
  totalCost += ranks.cost ?? 0;
  const rankItems = (ranks.data?.tasks?.[0]?.result as Array<{ items?: Array<{ target?: string; rank?: number }> }> | undefined)?.[0]?.items ?? [];
  console.log("\nPage/domain rank (DataForSEO, 0-1000):");
  for (const r of rankItems) console.log(`  ${r.rank ?? "n/a"} | ${r.target}`);
  if (ranks.error) console.log(`bulk_ranks ERROR: ${ranks.error}`);

  for (const url of POSTS) {
    const ranked = await rankedKeywords(url, { ...common, limit: 100, cacheFamily: "competitor_rankings" });
    totalCost += ranked.cost ?? 0;
    console.log(`\n##### ${url}`);
    if (ranked.error || !ranked.data) {
      console.log(`  ranked_keywords ERROR: ${ranked.error}`);
      continue;
    }
    const result = (ranked.data.tasks?.[0]?.result as Array<{ total_count?: number; metrics?: { organic?: { etv?: number } }; items?: RankedRow[] }> | undefined)?.[0];
    const rows = result?.items ?? [];
    console.log(`  total ranked keywords=${result?.total_count ?? rows.length}, page etv=${result?.metrics?.organic?.etv?.toFixed?.(1) ?? "n/a"}`);
    const sorted = [...rows].sort((a, b) => (b.keyword_data?.keyword_info?.search_volume ?? 0) - (a.keyword_data?.keyword_info?.search_volume ?? 0));
    for (const r of sorted.slice(0, 15)) {
      console.log(
        `  pos=${r.ranked_serp_element?.serp_item?.rank_absolute ?? "n/a"} | vol=${r.keyword_data?.keyword_info?.search_volume ?? "n/a"} | etv=${r.ranked_serp_element?.serp_item?.etv?.toFixed?.(1) ?? "n/a"} | ${r.keyword_data?.keyword}`
      );
    }
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
