// Finds real organic competitors for footballparent.co.uk: domains that
// rank for the same keywords, not a guessed/branded list. One Labs call
// (dataforseo_labs/google/competitors_domain/live), cheap and cacheable.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/discover-niche-competitors.ts
import { migrate } from "../database/migrate";
import { competitorsDomain } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TARGET = "footballparent.co.uk";
const LIMIT = 50;

type CompetitorItem = {
  domain?: string;
  avg_position?: number;
  sum_position?: number;
  intersections?: number;
  full_domain_metrics?: { organic?: { etv?: number; count?: number } };
  metrics?: { organic?: { etv?: number; count?: number } };
};

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 1 competitors_domain call for ${TARGET}, limit ${LIMIT}. Rough estimated cost: ~$0.05.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const result = await competitorsDomain(TARGET, {
    workflow: "discover-niche-competitors",
    environment: "live",
    confirmLive: true,
    limit: LIMIT,
    excludeTopDomains: true,
  });

  if (result.error || !result.data) {
    console.log(`ERROR: ${result.error}`);
    return;
  }

  const items = (result.data.tasks?.[0]?.result as Array<{ items?: CompetitorItem[] }> | undefined) ?? [];
  const rows = items[0]?.items ?? [];

  console.log(`\n=== Organic keyword-overlap competitors for ${TARGET} (${rows.length} found) ===`);
  for (const r of rows) {
    const etv = r.metrics?.organic?.etv ?? r.full_domain_metrics?.organic?.etv;
    const count = r.metrics?.organic?.count ?? r.full_domain_metrics?.organic?.count;
    console.log(
      `${r.domain}: shared keywords=${r.intersections ?? "n/a"}, their ranked keywords=${count ?? "n/a"}, their est. organic etv=${etv?.toFixed?.(0) ?? "n/a"}, avg overlap position=${r.avg_position?.toFixed?.(1) ?? "n/a"}`
    );
  }

  console.log(`\nTotal actual API-reported cost: $${(result.cost ?? 0).toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
