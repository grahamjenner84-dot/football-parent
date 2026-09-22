// One more targeted attempt to find the exact fourfourtwo.com ->
// grassrootsfootball.co.uk link and its last-reconfirmed crawl date, since
// the previous "in" filter attempt returned 0 rows (likely wrong filter
// syntax). Trying DataForSEO's documented single-condition array format.
//
// Usage: LIVE_CONFIRM=yes npx tsx scripts/seo/cli/grassrootsfootball-fourfourtwo-check.ts
import { migrate } from "../database/migrate";
import { backlinksList } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TARGET = "grassrootsfootball.co.uk";

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 1 backlinks/backlinks call, single-condition filter on domain_from = fourfourtwo.com. Rough estimated cost: ~$0.03.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }
  const common = { workflow: "grassrootsfootball-fourfourtwo-check", environment: "live" as const, confirmLive: true };
  const filters = ["domain_from", "=", "fourfourtwo.com"];
  const res = await backlinksList(TARGET, { ...common, limit: 50, backlinksStatusType: "live", filters });
  console.log("error:", res.error);
  console.log(JSON.stringify(res.data?.tasks?.[0], null, 1)?.slice(0, 3000));
  console.log(`Cost: $${(res.cost ?? 0).toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
