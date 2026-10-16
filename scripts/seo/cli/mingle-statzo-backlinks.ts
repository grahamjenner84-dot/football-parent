// Linking pages (not just referring domains) for mingle.sport and
// statzoapp.com, to answer "what are their best inbound links". The cached
// 27 Aug referring-domain list for Mingle was the top 100 of 291 by rank and
// missed footballdna.co.uk, which Graham could see linking to them, so this
// pulls every link (live and lost) excluding Mingle's own mirror
// (mingle-sport.pages.dev, ~1000 self links), plus a direct check for
// footballdna.co.uk -> mingle.sport.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/mingle-statzo-backlinks.ts
import fs from "node:fs";
import { migrate } from "../database/migrate";
import { backlinksList } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const OUT = "seo-data/exports/mingle-statzo-backlinks-2026-10-16.json";
const PULLS: { key: string; target: string; filters?: unknown[] }[] = [
  { key: "mingle.sport", target: "mingle.sport", filters: ["domain_from", "not_like", "%mingle%"] },
  { key: "statzoapp.com", target: "statzoapp.com" },
  { key: "footballdna->mingle", target: "mingle.sport", filters: ["domain_from", "like", "%footballdna%"] },
];

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const out: Record<string, unknown[]> = {};
  let cost = 0;
  for (const { key, target, filters } of PULLS) {
    const result = await backlinksList(target, {
      workflow: "mingle-statzo-backlinks",
      environment: "live",
      confirmLive: true,
      limit: 1000,
      filters,
      backlinksStatusType: "all",
    });
    if (result.error || !result.data) {
      console.log(`${key} failed: ${result.error}`);
      continue;
    }
    cost += result.cost ?? 0;
    const res = result.data.tasks?.[0]?.result?.[0] as { total_count?: number; items?: unknown[] } | undefined;
    out[key] = res?.items ?? [];
    console.log(`${key}: total_count=${res?.total_count} returned=${out[key].length}`);
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`cost=$${cost.toFixed(4)} -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
