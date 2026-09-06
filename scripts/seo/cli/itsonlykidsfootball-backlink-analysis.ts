// Backlink analysis for itsonlykidsfootball.com (a grassroots youth-football
// podcast/content site, same parent-coach audience as Football Parent - not
// an app competitor). Finds domains linking to them but not to
// footballparent.co.uk, per the seo-links skill workflow.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/itsonlykidsfootball-backlink-analysis.ts
import { migrate } from "../database/migrate";
import { domainIntersection, backlinksSummary, bulkRanks } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TARGET = "itsonlykidsfootball.com";
const US = "footballparent.co.uk";

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: 1 backlinks/summary for ${TARGET}, 1 domain_intersection (${TARGET} vs ${US}), 1 bulk_ranks screening pass on the resulting prospects. Rough estimated cost: ~$0.10.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "itsonlykidsfootball-backlink-analysis", environment: "live" as const, confirmLive: true };

  console.log(`\n=== ${TARGET}: backlink profile summary ===`);
  const summary = await backlinksSummary(TARGET, common);
  totalCost += summary.cost ?? 0;
  if (summary.error || !summary.data) {
    console.log(`ERROR: ${summary.error}`);
  } else {
    console.log(JSON.stringify(summary.data.tasks?.[0]?.result?.[0], null, 1)?.slice(0, 800));
  }

  console.log(`\n=== Backlink prospects: domains linking to ${TARGET} but not to ${US} ===`);
  const intersection = await domainIntersection([TARGET], { ...common, limit: 200, excludeTargets: [US] });
  totalCost += intersection.cost ?? 0;
  let prospectDomains: string[] = [];
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
      if (d?.target) prospectDomains.push(d.target);
    }
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
