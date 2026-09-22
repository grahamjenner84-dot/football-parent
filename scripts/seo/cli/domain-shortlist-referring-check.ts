// Drill-down for the two domains from domain-shortlist-backlink-check.ts
// that showed non-trivial signal: footballteamcoach.com (153 referring
// domains, spam_score 59 - needs quality check) and
// grassrootsfootballcoaching.com (rank 65 from a single referring domain -
// needs to know what that one domain is).
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/domain-shortlist-referring-check.ts
import { migrate } from "../database/migrate";
import { referringDomains } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

type RefDomainRow = { domain?: string; rank?: number; backlinks?: number; backlinks_spam_score?: number; referring_domains_nofollow?: number; first_seen?: string };

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 2 backlinks/referring_domains calls (limit 200 each). Rough estimated cost: ~$0.05.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "domain-shortlist-referring-check", environment: "live" as const, confirmLive: true };

  for (const target of ["footballteamcoach.com", "grassrootsfootballcoaching.com"]) {
    console.log(`\n=== ${target}: referring domains ===`);
    const ref = await referringDomains(target, { ...common, limit: 200 });
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
