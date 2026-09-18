// Backlink analysis for two competitors not yet in the `competitors` table:
// teamgrassroots.co.uk and diamondfootball.com. Part of a wider backlink
// prospecting pass alongside the already-researched teamstats.net,
// juniorgrassrootshub.com and grassrootsfootballuk.com (see backlink_prospects
// rows with competitor_id 1/2/3). Finds domains linking to these two but not
// to footballparent.co.uk, per the seo-links skill workflow.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/teamgrassroots-diamondfootball-backlink-analysis.ts
import { migrate } from "../database/migrate";
import { domainIntersection, backlinksSummary, bulkRanks } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const US = "footballparent.co.uk";
const TARGETS = ["teamgrassroots.co.uk", "diamondfootball.com"];

type IntersectionRow = { target?: string; rank?: number; backlinks?: number; referring_domains?: number; backlinks_spam_score?: number };

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: ${TARGETS.length} backlinks/summary calls, ${TARGETS.length} domain_intersection calls (each vs ${US}), 1 bulk_ranks screening pass on the combined prospects. Rough estimated cost: ~$0.20.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "teamgrassroots-diamondfootball-backlink-analysis", environment: "live" as const, confirmLive: true };
  const allProspects: Record<string, { domains: Set<string>; rows: Map<string, IntersectionRow> }> = {};

  for (const target of TARGETS) {
    console.log(`\n=== ${target}: backlink profile summary ===`);
    const summary = await backlinksSummary(target, common);
    totalCost += summary.cost ?? 0;
    if (summary.error || !summary.data) {
      console.log(`ERROR: ${summary.error}`);
    } else {
      console.log(JSON.stringify(summary.data.tasks?.[0]?.result?.[0], null, 1)?.slice(0, 800));
    }

    console.log(`\n=== Backlink prospects: domains linking to ${target} but not to ${US} ===`);
    const intersection = await domainIntersection([target], { ...common, limit: 200, excludeTargets: [US] });
    totalCost += intersection.cost ?? 0;
    allProspects[target] = { domains: new Set(), rows: new Map() };
    if (intersection.error || !intersection.data) {
      console.log(`ERROR: ${intersection.error}`);
      continue;
    }
    const items =
      (intersection.data.tasks?.[0]?.result as Array<{ items?: Array<{ domain_intersection?: Record<string, IntersectionRow> }> }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} prospect domains found (linking to ${target}, not to ${US}):`);
    const sorted = [...rows].sort((a, b) => (b.domain_intersection?.["1"]?.rank ?? 0) - (a.domain_intersection?.["1"]?.rank ?? 0));
    for (const r of sorted) {
      const d = r.domain_intersection?.["1"];
      console.log(
        `  ${d?.target} | rank=${d?.rank ?? "n/a"} | backlinks=${d?.backlinks ?? "n/a"} | referring_domains=${d?.referring_domains ?? "n/a"} | spam_score=${d?.backlinks_spam_score ?? "n/a"}`
      );
      if (d?.target) {
        allProspects[target].domains.add(d.target);
        allProspects[target].rows.set(d.target, d);
      }
    }
  }

  const combinedDomains = Array.from(new Set(Object.values(allProspects).flatMap((p) => Array.from(p.domains))));
  if (combinedDomains.length > 0) {
    console.log(`\n=== bulk_ranks screening pass on ${combinedDomains.length} combined prospect domains ===`);
    const ranks = await bulkRanks(combinedDomains, common);
    totalCost += ranks.cost ?? 0;
    if (ranks.error || !ranks.data) {
      console.log(`ERROR: ${ranks.error}`);
    } else {
      const items = (ranks.data.tasks?.[0]?.result as Array<{ items?: Array<{ target?: string; rank?: number }> }> | undefined) ?? [];
      const rankRows = items[0]?.items ?? [];
      for (const r of rankRows) {
        console.log(`  ${r.target} | bulk_rank=${r.rank ?? "n/a"}`);
      }
    }
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
