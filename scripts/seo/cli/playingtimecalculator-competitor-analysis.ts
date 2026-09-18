// Competitor analysis for playingtimecalculator.com, which ranks #2 for
// "equal game time football" (~300 searches/month per the user). Checks the
// live SERP for that exact query, the competitor's domain scale + ranked
// keywords, and backlink-prospecting per the seo-links skill workflow
// (domains linking to them but not to footballparent.co.uk).
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/playingtimecalculator-competitor-analysis.ts
import { migrate } from "../database/migrate";
import { domainRankOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { domainIntersection, backlinksSummary } from "../dataforseo/endpoints/backlinks";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TARGET = "playingtimecalculator.com";
const US = "footballparent.co.uk";
const QUERY = "equal game time football";

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: 1 SERP live check for "${QUERY}", 1 domain_rank_overview + 1 ranked_keywords (limit 300) for ${TARGET}, 1 backlinks/summary for ${TARGET}, 1 domain_intersection (${TARGET} vs ${US}). Rough estimated cost: ~$0.25.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "playingtimecalculator-competitor-analysis", environment: "live" as const, confirmLive: true };

  console.log(`\n=== Live SERP for "${QUERY}" ===`);
  const serp = await googleOrganicSerp(QUERY, common);
  totalCost += serp.cost ?? 0;
  if (serp.error || !serp.data) {
    console.log(`ERROR: ${serp.error}`);
  } else {
    const items =
      (serp.data.tasks?.[0]?.result as
        | Array<{ items?: Array<{ type?: string; rank_absolute?: number; domain?: string; url?: string; title?: string; description?: string } > }>
        | undefined) ?? [];
    const rows = (items[0]?.items ?? []).filter((r) => r.type === "organic");
    console.log(`${rows.length} total organic results returned.`);
    for (const r of rows) {
      console.log(`  #${r.rank_absolute} ${r.domain} | ${r.title}`);
    }
    const us = rows.find((r) => (r.domain ?? "").includes("footballparent"));
    console.log(`\nfootballparent.co.uk in this SERP: ${us ? `#${us.rank_absolute} - ${us.url}` : "NOT in returned organic results"}`);
  }

  console.log(`\n=== ${TARGET}: domain scale ===`);
  const overview = await domainRankOverview(TARGET, common);
  totalCost += overview.cost ?? 0;
  if (overview.error || !overview.data) {
    console.log(`ERROR: ${overview.error}`);
  } else {
    const items = (overview.data.tasks?.[0]?.result as Array<{ items?: Array<{ metrics?: { organic?: { count?: number; etv?: number; pos_1?: number; pos_2_3?: number } } } > }> | undefined) ?? [];
    const metrics = items[0]?.items?.[0]?.metrics?.organic;
    console.log(
      `ranked keywords=${metrics?.count ?? "n/a"}, estimated monthly organic traffic (etv)=${metrics?.etv?.toFixed?.(0) ?? "n/a"}, #1 positions=${metrics?.pos_1 ?? "n/a"}, top-3 positions=${metrics?.pos_2_3 ?? "n/a"}`
    );
  }

  console.log(`\n=== ${TARGET}: ranked keywords (up to 300) ===`);
  const ranked = await rankedKeywords(TARGET, { ...common, limit: 300, cacheFamily: "competitor_rankings" });
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
    const target = rows.find((r) => (r.keyword_data?.keyword ?? "").toLowerCase() === QUERY);
    console.log(`\nExact match for "${QUERY}": ${target ? JSON.stringify(target) : "not found in top 300 ranked keywords"}`);
  }

  console.log(`\n=== ${TARGET}: backlink profile summary ===`);
  const summary = await backlinksSummary(TARGET, common);
  totalCost += summary.cost ?? 0;
  if (summary.error || !summary.data) {
    console.log(`ERROR: ${summary.error}`);
  } else {
    console.log(JSON.stringify(summary.data.tasks?.[0]?.result?.[0], null, 1)?.slice(0, 1200));
  }

  console.log(`\n=== ${US}: backlink profile summary (for comparison) ===`);
  const usSummary = await backlinksSummary(US, common);
  totalCost += usSummary.cost ?? 0;
  if (usSummary.error || !usSummary.data) {
    console.log(`ERROR: ${usSummary.error}`);
  } else {
    console.log(JSON.stringify(usSummary.data.tasks?.[0]?.result?.[0], null, 1)?.slice(0, 1200));
  }

  console.log(`\n=== Backlink prospects: domains linking to ${TARGET} but not to ${US} ===`);
  const intersection = await domainIntersection([TARGET], { ...common, limit: 200, excludeTargets: [US] });
  totalCost += intersection.cost ?? 0;
  if (intersection.error || !intersection.data) {
    console.log(`ERROR: ${intersection.error}`);
  } else {
    const items =
      (intersection.data.tasks?.[0]?.result as
        | Array<{ items?: Array<{ domain_intersection?: Record<string, { target?: string; rank?: number; backlinks?: number; referring_domains?: number; backlinks_spam_score?: number }> }> }>
        | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} prospect domains found (linking to ${TARGET}, not to ${US}):`);
    const sorted = [...rows].sort((a, b) => (b.domain_intersection?.["1"]?.rank ?? 0) - (a.domain_intersection?.["1"]?.rank ?? 0));
    for (const r of sorted.slice(0, 60)) {
      const d = r.domain_intersection?.["1"];
      console.log(
        `  ${d?.target} | rank=${d?.rank ?? "n/a"} | backlinks=${d?.backlinks ?? "n/a"} | referring_domains=${d?.referring_domains ?? "n/a"} | spam_score=${d?.backlinks_spam_score ?? "n/a"}`
      );
    }
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
