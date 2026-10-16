// Follow-up to coach-app-competitor-snapshot.ts (2026-10-16):
//   1. Same deep pull for two more rotation apps: fairsub.app, pitch-planner.app.
//   2. Index-coverage check on our own site. The first snapshot showed
//      footballparent.co.uk with 13 linking domains, 0 crawled pages, and no
//      Football DNA link, which we know exists (footballdna.co.uk/3-v-3-...
//      links to /parent-guides/futurefit-football-dna-interview-part-1).
//      Pulls summary for the www host too, every backlink DataForSEO holds
//      for us (live and lost), and a direct footballdna -> us check, to see
//      whether the index is missing our links or the links are missing.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-app-competitor-snapshot-2.ts
import fs from "node:fs";
import { migrate } from "../database/migrate";
import { backlinksList, backlinksSummary, referringDomains } from "../dataforseo/endpoints/backlinks";
import { domainRankOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const DEEP = ["fairsub.app", "pitch-planner.app"];
const OUT = "seo-data/exports/coach-app-competitor-snapshot-2-2026-10-16.json";

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const common = { workflow: "coach-app-competitor-snapshot", environment: "live" as const, confirmLive: true };
  let cost = 0;
  const first = (r: Awaited<ReturnType<typeof backlinksSummary>>) => {
    cost += r.cost ?? 0;
    if (r.error) console.log(`  error: ${r.error}`);
    return r.data?.tasks?.[0]?.result?.[0] ?? null;
  };
  const out: Record<string, Record<string, unknown>> = {};

  for (const target of DEEP) {
    console.log(target);
    out[target] = {
      summary: first(await backlinksSummary(target, common)),
      organic: first(await domainRankOverview(target, { ...common, limit: 1 })),
      referringDomains: first(await referringDomains(target, { ...common, limit: 100 })),
      backlinks: first(await backlinksList(target, { ...common, limit: 500, backlinksStatusType: "all" })),
      rankedKeywords: first(await rankedKeywords(target, { ...common, limit: 200 })),
    };
  }

  console.log("footballparent.co.uk coverage check");
  out["us"] = {
    summaryWww: first(await backlinksSummary("www.footballparent.co.uk", common)),
    backlinksAll: first(await backlinksList("footballparent.co.uk", { ...common, limit: 1000, backlinksStatusType: "all" })),
    fromFootballDna: first(await backlinksList("footballparent.co.uk", { ...common, limit: 50, backlinksStatusType: "all", filters: ["domain_from", "like", "%footballdna%"] })),
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`cost=$${cost.toFixed(4)} -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
