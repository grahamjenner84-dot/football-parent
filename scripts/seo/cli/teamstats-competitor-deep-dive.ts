// Deep dive on teamstats.net (surfaced as a product-competitor candidate for
// the Coach App by discover-niche-competitors.ts): domain scale, full
// ranked-keyword list, and backlink-prospecting (domains that link to them
// but not to footballparent.co.uk - the "potential links to go get" list).
// Also checks the specific footballparent.co.uk <- teamstats.net backlink's
// current dofollow status (see the caveat in backlinksList's comment about
// what this API can and can't tell you about *when* an attribute changed).
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/teamstats-competitor-deep-dive.ts
import { migrate } from "../database/migrate";
import { domainRankOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { domainIntersection, backlinksList } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TEAMSTATS = "teamstats.net";
const US = "footballparent.co.uk";

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: 1 domain_rank_overview + 1 ranked_keywords (limit 300) for ${TEAMSTATS}, 1 domain_intersection (${TEAMSTATS} vs ${US}), 1 backlinks lookup for the specific ${TEAMSTATS}->${US} link. Rough estimated cost: ~$0.20.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "teamstats-competitor-deep-dive", environment: "live" as const, confirmLive: true };

  console.log("\n=== teamstats.net: domain scale ===");
  const overview = await domainRankOverview(TEAMSTATS, common);
  totalCost += overview.cost ?? 0;
  if (overview.error || !overview.data) {
    console.log(`ERROR: ${overview.error}`);
  } else {
    const items = (overview.data.tasks?.[0]?.result as Array<{ items?: Array<{ metrics?: { organic?: { count?: number; etv?: number; pos_1?: number; pos_2_3?: number } } } > }> | undefined) ?? [];
    const metrics = items[0]?.items?.[0]?.metrics?.organic;
    console.log(
      `ranked keywords=${metrics?.count ?? "n/a"}, estimated monthly organic traffic (etv)=${metrics?.etv?.toFixed?.(0) ?? "n/a"}, #1 positions=${metrics?.pos_1 ?? "n/a"}, top-3 positions=${metrics?.pos_2_3 ?? "n/a"}`
    );
    console.log(JSON.stringify(overview.data.tasks?.[0]?.result?.[0], null, 1)?.slice(0, 300));
  }

  console.log("\n=== teamstats.net: ranked keywords (up to 300) ===");
  const ranked = await rankedKeywords(TEAMSTATS, { ...common, limit: 300, cacheFamily: "competitor_rankings" });
  totalCost += ranked.cost ?? 0;
  if (ranked.error || !ranked.data) {
    console.log(`ERROR: ${ranked.error}`);
  } else {
    const items =
      (ranked.data.tasks?.[0]?.result as
        | Array<{
            items?: Array<{
              keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number } };
              ranked_serp_element?: { serp_item?: { etv?: number; rank_absolute?: number } };
            }>;
          }>
        | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    const sorted = [...rows].sort((a, b) => (b.ranked_serp_element?.serp_item?.etv ?? 0) - (a.ranked_serp_element?.serp_item?.etv ?? 0));
    console.log(`${rows.length} ranked keywords retrieved. Top 40 by estimated traffic:`);
    for (const r of sorted.slice(0, 40)) {
      console.log(
        `  ${r.keyword_data?.keyword} | vol=${r.keyword_data?.keyword_info?.search_volume ?? "n/a"} | pos=${r.ranked_serp_element?.serp_item?.rank_absolute ?? "n/a"} | etv=${r.ranked_serp_element?.serp_item?.etv?.toFixed?.(1) ?? "n/a"}`
      );
    }
  }

  console.log(`\n=== Backlink prospects: domains linking to ${TEAMSTATS} but not to ${US} ===`);
  const intersection = await domainIntersection([TEAMSTATS], { ...common, limit: 200, excludeTargets: [US] });
  totalCost += intersection.cost ?? 0;
  if (intersection.error || !intersection.data) {
    console.log(`ERROR: ${intersection.error}`);
  } else {
    const items =
      (intersection.data.tasks?.[0]?.result as
        | Array<{ items?: Array<{ domain_intersection?: Record<string, { target?: string; rank?: number; backlinks?: number; referring_domains?: number; backlinks_spam_score?: number }> }> }>
        | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} prospect domains found (linking to ${TEAMSTATS}, not to ${US}):`);
    const sorted = [...rows].sort((a, b) => (b.domain_intersection?.["1"]?.rank ?? 0) - (a.domain_intersection?.["1"]?.rank ?? 0));
    for (const r of sorted.slice(0, 40)) {
      const d = r.domain_intersection?.["1"];
      console.log(
        `  ${d?.target} | rank=${d?.rank ?? "n/a"} | backlinks=${d?.backlinks ?? "n/a"} | referring_domains=${d?.referring_domains ?? "n/a"} | spam_score=${d?.backlinks_spam_score ?? "n/a"}`
      );
    }
  }

  console.log(`\n=== Current state of the ${TEAMSTATS} -> ${US} backlink ===`);
  const link = await backlinksList(US, {
    ...common,
    filters: [["domain_from", "=", TEAMSTATS]],
    backlinksStatusType: "all",
    limit: 20,
  });
  totalCost += link.cost ?? 0;
  if (link.error || !link.data) {
    console.log(`ERROR: ${link.error}`);
  } else {
    console.log("RAW SHAPE SAMPLE (first 2000 chars):");
    console.log(JSON.stringify(link.data.tasks?.[0]?.result, null, 1)?.slice(0, 2000));
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
