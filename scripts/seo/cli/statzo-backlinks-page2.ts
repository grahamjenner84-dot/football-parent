// Second page (rows 1000+) of statzoapp.com's backlinks: the 16 Oct pull in
// mingle-statzo-backlinks.ts returned 1000 of 1462. Merges into the same
// export under "statzoapp.com".
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/statzo-backlinks-page2.ts
import fs from "node:fs";
import { migrate } from "../database/migrate";
import { backlinksList } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const OUT = "seo-data/exports/mingle-statzo-backlinks-2026-10-16.json";

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const data = JSON.parse(fs.readFileSync(OUT, "utf8")) as Record<string, unknown[]>;
  const result = await backlinksList("statzoapp.com", { workflow: "mingle-statzo-backlinks", environment: "live", confirmLive: true, limit: 1000, offset: 1000, backlinksStatusType: "all" });
  if (result.error || !result.data) {
    console.log(`failed: ${result.error}`);
    return;
  }
  const res = result.data.tasks?.[0]?.result?.[0] as { total_count?: number; items?: unknown[] } | undefined;
  data["statzoapp.com"] = [...data["statzoapp.com"], ...(res?.items ?? [])];
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(`total_count=${res?.total_count} page2=${res?.items?.length} now=${data["statzoapp.com"].length} cost=$${(result.cost ?? 0).toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
