// Domain-acquisition due diligence for grassrootsfootball.co.uk, which
// Graham spotted for sale (2026-09-17). It currently 301-redirects to
// teamstats.net/blog, confirming TeamStats owns/controls it. Checking real
// backlink profile (not just the domain name) before any purchase decision.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/grassrootsfootball-couk-domain-check.ts
import { migrate } from "../database/migrate";
import { backlinksSummary, referringDomains, backlinksList } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TARGET = "grassrootsfootball.co.uk";

type RefDomainRow = { domain?: string; rank?: number; backlinks?: number; first_seen?: string; backlinks_spam_score?: number };
type BacklinkRow = { url_from?: string; domain_from?: string; anchor?: string; dofollow?: boolean; first_seen?: string };

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 1 backlinks/summary, 1 backlinks/referring_domains (limit 200), 1 backlinks/backlinks (limit 200) for ${TARGET}. Rough estimated cost: ~$0.10.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "grassrootsfootball-couk-domain-check", environment: "live" as const, confirmLive: true };

  console.log(`\n=== ${TARGET}: backlink profile summary ===`);
  const summary = await backlinksSummary(TARGET, common);
  totalCost += summary.cost ?? 0;
  if (summary.error || !summary.data) {
    console.log(`ERROR: ${summary.error}`);
  } else {
    console.log(JSON.stringify(summary.data.tasks?.[0]?.result?.[0], null, 1));
  }

  console.log(`\n=== ${TARGET}: referring domains (top 200 by rank) ===`);
  const ref = await referringDomains(TARGET, { ...common, limit: 200 });
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

  console.log(`\n=== ${TARGET}: individual backlinks (top 200, to see exact linking pages/anchors) ===`);
  const list = await backlinksList(TARGET, { ...common, limit: 200, backlinksStatusType: "live" });
  totalCost += list.cost ?? 0;
  if (list.error || !list.data) {
    console.log(`ERROR: ${list.error}`);
  } else {
    const items = (list.data.tasks?.[0]?.result as Array<{ items?: BacklinkRow[] }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} backlink rows:`);
    for (const r of rows) {
      console.log(`  [${r.domain_from}] url_from=${r.url_from} | anchor="${r.anchor}" | dofollow=${r.dofollow} | first_seen=${r.first_seen}`);
    }
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
