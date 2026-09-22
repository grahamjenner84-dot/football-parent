// Backlink due-diligence for coachfootball.com (2026-09-18). Unlike the
// other recent domain-shortlist checks, this one DOES resolve (parked/blank
// page), so it's actually registered - worth checking its full backlink
// history in case it had real content in the past.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coachfootball-check.ts
import { migrate } from "../database/migrate";
import { backlinksSummary, referringDomains } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TARGET = "coachfootball.com";

type RefDomainRow = { domain?: string; rank?: number; backlinks?: number; backlinks_spam_score?: number; first_seen?: string };

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 1 backlinks/summary, 1 backlinks/referring_domains (limit 100) for ${TARGET}. Rough estimated cost: ~$0.04.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "coachfootball-check", environment: "live" as const, confirmLive: true };

  console.log(`\n=== ${TARGET}: backlink summary ===`);
  const summary = await backlinksSummary(TARGET, common);
  totalCost += summary.cost ?? 0;
  if (summary.error || !summary.data) {
    console.log(`ERROR: ${summary.error}`);
  } else {
    const r = summary.data.tasks?.[0]?.result?.[0];
    console.log(JSON.stringify(r, null, 1)?.slice(0, 1000));
  }

  console.log(`\n=== ${TARGET}: referring domains ===`);
  const ref = await referringDomains(TARGET, { ...common, limit: 100 });
  totalCost += ref.cost ?? 0;
  if (ref.error || !ref.data) {
    console.log(`ERROR: ${ref.error}`);
  } else {
    const items = (ref.data.tasks?.[0]?.result as Array<{ items?: RefDomainRow[] }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} referring domains:`);
    const sorted = [...rows].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
    for (const r of sorted) {
      console.log(`  ${r.domain} | rank=${r.rank ?? "n/a"} | backlinks=${r.backlinks ?? "n/a"} | spam_score=${r.backlinks_spam_score ?? "n/a"} | first_seen=${r.first_seen}`);
    }
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
