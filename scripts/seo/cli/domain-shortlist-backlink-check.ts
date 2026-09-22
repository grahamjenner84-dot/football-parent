// Backlink due-diligence for 6 domains Graham is considering (2026-09-17):
// junior-football.com, footballteamcoach.com, grassrootsfootballcoaching.com,
// academypathway.co.uk, grassrootspathway.co.uk, coachingfootball.co.uk.
// None currently resolve via DNS (checked separately), so this checks
// whether DataForSEO's crawl history shows any past backlink profile worth
// knowing about before treating them as either registrable-fresh or a
// dead-end purchase.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/domain-shortlist-backlink-check.ts
import { migrate } from "../database/migrate";
import { backlinksSummary } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TARGETS = [
  "junior-football.com",
  "footballteamcoach.com",
  "grassrootsfootballcoaching.com",
  "academypathway.co.uk",
  "grassrootspathway.co.uk",
  "coachingfootball.co.uk",
];

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: ${TARGETS.length} backlinks/summary calls. Rough estimated cost: ~$0.10.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "domain-shortlist-backlink-check", environment: "live" as const, confirmLive: true };

  for (const target of TARGETS) {
    console.log(`\n=== ${target} ===`);
    const summary = await backlinksSummary(target, common);
    totalCost += summary.cost ?? 0;
    if (summary.error || !summary.data) {
      console.log(`ERROR: ${summary.error}`);
      continue;
    }
    const r = summary.data.tasks?.[0]?.result?.[0] as
      | { target?: string; first_seen?: string; lost_date?: string; rank?: number; backlinks?: number; backlinks_spam_score?: number; referring_domains?: number; referring_main_domains?: number; referring_domains_nofollow?: number; target_spam_score?: number }
      | undefined;
    if (!r) {
      console.log("No result (domain likely never crawled/indexed).");
      continue;
    }
    console.log(
      `rank=${r.rank ?? 0} | backlinks=${r.backlinks ?? 0} | referring_domains=${r.referring_domains ?? 0} | referring_domains_nofollow=${r.referring_domains_nofollow ?? 0} | spam_score=${r.backlinks_spam_score ?? "n/a"} | target_spam_score=${r.target_spam_score ?? "n/a"} | first_seen=${r.first_seen ?? "n/a"} | lost_date=${r.lost_date ?? "n/a"}`
    );
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
