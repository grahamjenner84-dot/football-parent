// Ranked-keyword pull for the 3 grassroots team-management app competitors
// that showed up in the "football team management app" / "grassroots
// football app" SERPs: Spond, Mingle, and the FA's own Matchday app
// (marketed off grassrootstechnology.thefa.com, not the app-store listing
// pages). Same pattern as teamstats-competitor-deep-dive.ts - domain scale
// then top ranked keywords by estimated traffic, to see what real query
// language they're actually capturing.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/grassroots-app-competitors-ranked-keywords.ts
import { migrate } from "../database/migrate";
import { domainRankOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const DOMAINS = ["spond.com", "mingle.sport", "grassrootstechnology.thefa.com"];

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: ${DOMAINS.length} domain_rank_overview + ${DOMAINS.length} ranked_keywords (limit 300) calls, one pair per domain (${DOMAINS.join(", ")}). Rough estimated cost: ~$0.30.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "grassroots-app-competitors-ranked-keywords", environment: "live" as const, confirmLive: true };

  for (const domain of DOMAINS) {
    console.log(`\n\n########## ${domain} ##########`);

    const overview = await domainRankOverview(domain, common);
    totalCost += overview.cost ?? 0;
    if (overview.error || !overview.data) {
      console.log(`domain_rank_overview ERROR: ${overview.error}`);
    } else {
      const items = (overview.data.tasks?.[0]?.result as Array<{ items?: Array<{ metrics?: { organic?: { count?: number; etv?: number; pos_1?: number; pos_2_3?: number } } } > }> | undefined) ?? [];
      const metrics = items[0]?.items?.[0]?.metrics?.organic;
      console.log(
        `Domain scale: ranked keywords=${metrics?.count ?? "n/a"}, estimated monthly organic traffic (etv)=${metrics?.etv?.toFixed?.(0) ?? "n/a"}, #1 positions=${metrics?.pos_1 ?? "n/a"}, top-3 positions=${metrics?.pos_2_3 ?? "n/a"}`
      );
    }

    const ranked = await rankedKeywords(domain, { ...common, limit: 300, cacheFamily: "competitor_rankings" });
    totalCost += ranked.cost ?? 0;
    if (ranked.error || !ranked.data) {
      console.log(`ranked_keywords ERROR: ${ranked.error}`);
      continue;
    }
    const items =
      (ranked.data.tasks?.[0]?.result as
        | Array<{
            items?: Array<{
              keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number } };
              ranked_serp_element?: { serp_item?: { etv?: number; rank_absolute?: number; url?: string } };
            }>;
          }>
        | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    const sorted = [...rows].sort((a, b) => (b.ranked_serp_element?.serp_item?.etv ?? 0) - (a.ranked_serp_element?.serp_item?.etv ?? 0));
    console.log(`${rows.length} ranked keywords retrieved. Top 50 by estimated traffic:`);
    for (const r of sorted.slice(0, 50)) {
      console.log(
        `  ${r.keyword_data?.keyword} | vol=${r.keyword_data?.keyword_info?.search_volume ?? "n/a"} | pos=${r.ranked_serp_element?.serp_item?.rank_absolute ?? "n/a"} | etv=${r.ranked_serp_element?.serp_item?.etv?.toFixed?.(1) ?? "n/a"} | url=${r.ranked_serp_element?.serp_item?.url ?? "n/a"}`
      );
    }
  }

  console.log(`\n\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
