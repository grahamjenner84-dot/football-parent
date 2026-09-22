// Step 7/8 domain-quality screening signal for the playing-time prospecting
// brief: bulk_ranks across all A/B/C prospect domains (one call), plus a
// backlinks check on the one dead URL found (viennaelite.org) to test for a
// BROKEN CONTENT OPPORTUNITY per the brief's Step 6.
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { bulkRanks, referringDomains, backlinksSummary } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "playing-time-prospecting-domain-authority", environment: "live" as const, confirmLive: true };

  const domains = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-domains.json"), "utf8")) as string[];

  console.log(`=== bulk_ranks for ${domains.length} domains ===`);
  const ranks = await bulkRanks(domains, common);
  totalCost += ranks.cost ?? 0;
  if (ranks.error || !ranks.data) {
    console.log(`ERROR: ${ranks.error}`);
  } else {
    const items = (ranks.data.tasks?.[0]?.result as Array<{ items?: Array<{ target?: string; rank?: number }> }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    fs.writeFileSync(path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-bulkranks.json"), JSON.stringify(rows, null, 2));
    for (const r of rows) console.log(`  ${r.target}: rank=${r.rank ?? "n/a"}`);
  }

  console.log(`\n=== Broken content check: viennaelite.org playing-time-policy ===`);
  const summary = await backlinksSummary("viennaelite.org/parent-resources/playing-time-policy/127629", common);
  totalCost += summary.cost ?? 0;
  if (summary.error || !summary.data) {
    console.log(`ERROR: ${summary.error}`);
  } else {
    console.log(JSON.stringify(summary.data.tasks?.[0]?.result, null, 2));
  }
  const refDomains = await referringDomains("viennaelite.org/parent-resources/playing-time-policy/127629", { ...common, limit: 20 });
  totalCost += refDomains.cost ?? 0;
  if (refDomains.error || !refDomains.data) {
    console.log(`referring_domains ERROR: ${refDomains.error}`);
  } else {
    const items = (refDomains.data.tasks?.[0]?.result as Array<{ items?: unknown[] }> | undefined) ?? [];
    console.log(`referring_domains items: ${JSON.stringify(items[0]?.items ?? [], null, 2)}`);
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
