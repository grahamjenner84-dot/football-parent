// Backlink due-diligence for kidsfootballcamps.com (no DNS) and
// kidsfootball.com (resolves, blank/parked) - 2026-09-18.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/kidsfootball-check.ts
import { migrate } from "../database/migrate";
import { backlinksSummary, referringDomains } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TARGETS = ["kidsfootballcamps.com", "kidsfootball.com"];

type RefDomainRow = { domain?: string; rank?: number; backlinks?: number; backlinks_spam_score?: number; first_seen?: string };

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: ${TARGETS.length} backlinks/summary calls, plus referring_domains for any with real signal. Rough estimated cost: ~$0.08.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "kidsfootball-check", environment: "live" as const, confirmLive: true };
  const worthDrilling: string[] = [];

  for (const target of TARGETS) {
    console.log(`\n=== ${target} ===`);
    const summary = await backlinksSummary(target, common);
    totalCost += summary.cost ?? 0;
    if (summary.error || !summary.data) {
      console.log(`ERROR: ${summary.error}`);
      continue;
    }
    const r = summary.data.tasks?.[0]?.result?.[0] as
      | { rank?: number; backlinks?: number; backlinks_spam_score?: number; referring_domains?: number; referring_domains_nofollow?: number; first_seen?: string; lost_date?: string }
      | undefined;
    if (!r) {
      console.log("No result (domain likely never crawled/indexed).");
      continue;
    }
    console.log(
      `rank=${r.rank ?? 0} | backlinks=${r.backlinks ?? 0} | referring_domains=${r.referring_domains ?? 0} | referring_domains_nofollow=${r.referring_domains_nofollow ?? 0} | spam_score=${r.backlinks_spam_score ?? "n/a"} | first_seen=${r.first_seen ?? "n/a"} | lost_date=${r.lost_date ?? "n/a"}`
    );
    if ((r.rank ?? 0) > 0 || (r.referring_domains ?? 0) > 3) worthDrilling.push(target);
  }

  for (const target of worthDrilling) {
    console.log(`\n=== ${target}: referring domains (worth a closer look) ===`);
    const ref = await referringDomains(target, { ...common, limit: 100 });
    totalCost += ref.cost ?? 0;
    if (ref.error || !ref.data) {
      console.log(`ERROR: ${ref.error}`);
      continue;
    }
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
