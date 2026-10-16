// Known-competitors snapshot for the Coach App roadmap (coach-app repo, section 22 of
// coach-app-roadmap.md). Two depths:
//   - DEEP (new competitors Graham named on 2026-10-16: coachmeister.com,
//     subnowapp.com): backlinks summary, top referring domains, backlink
//     list (best pages and anchors), UK organic overview, UK ranked keywords.
//   - TABLE (everyone else already on the list, plus us): backlinks summary
//     and UK organic overview only, so all rows compare like for like.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-app-competitor-snapshot.ts
import fs from "node:fs";
import { migrate } from "../database/migrate";
import { backlinksList, backlinksSummary, referringDomains } from "../dataforseo/endpoints/backlinks";
import { domainRankOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const DEEP = ["coachmeister.com", "subnowapp.com"];
const TABLE = [
  "footballparent.co.uk",
  "teamstats.net",
  "mingle.sport",
  "statzoapp.com",
  "spond.com",
  "teamer.net",
  "mycoachfootball.com",
  "playingtimecalculator.com",
];
const OUT = "seo-data/exports/coach-app-competitor-snapshot-2026-10-16.json";

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const common = { workflow: "coach-app-competitor-snapshot", environment: "live" as const, confirmLive: true };
  const first = (r: Awaited<ReturnType<typeof backlinksSummary>>) => {
    cost += r.cost ?? 0;
    if (r.error) console.log(`  error: ${r.error}`);
    return r.data?.tasks?.[0]?.result?.[0] ?? null;
  };
  let cost = 0;
  const out: Record<string, Record<string, unknown>> = {};

  for (const target of [...DEEP, ...TABLE]) {
    console.log(target);
    const row: Record<string, unknown> = {};
    row.summary = first(await backlinksSummary(target, common));
    row.organic = first(await domainRankOverview(target, { ...common, limit: 1 }));
    if (DEEP.includes(target)) {
      row.referringDomains = first(await referringDomains(target, { ...common, limit: 100 }));
      row.backlinks = first(await backlinksList(target, { ...common, limit: 500, backlinksStatusType: "all" }));
      row.rankedKeywords = first(await rankedKeywords(target, { ...common, limit: 200 }));
    }
    out[target] = row;
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`cost=$${cost.toFixed(4)} -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
