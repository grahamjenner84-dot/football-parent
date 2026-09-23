// Domain-strength comparison for the grassrootsfootball.co.uk purchase
// decision: footballparent.co.uk vs teamstats.net (the current owner, whose
// blog the domain redirects to). grassrootsfootball.co.uk itself was pulled
// by grassrootsfootball-couk-redirect-map.ts on 2026-09-23.
//
// Usage (after explicit user approval in-session; live DataForSEO spend):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/domain-strength-compare.ts
//
// Cost: 2 x backlinks/summary + 2 x backlinks/referring_domains (limit 100).
// Roughly $0.05 to $0.10.
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { backlinksSummary, referringDomains } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const TARGETS = ["footballparent.co.uk", "teamstats.net"];
const SUMMARY_KEYS = ["rank", "backlinks", "referring_domains", "referring_main_domains", "backlinks_spam_score", "first_seen"];
const DATE = new Date().toISOString().slice(0, 10);

type RefRow = { domain?: string; rank?: number; backlinks?: number; backlinks_spam_score?: number; first_seen?: string };

async function main() {
  migrate();
  const liveReady =
    process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: backlinks/summary + backlinks/referring_domains (limit 100, live) for ${TARGETS.join(", ")}. Rough cost $0.05-$0.10.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }
  const common = { workflow: "domain-strength-compare", environment: "live" as const, confirmLive: true };
  let cost = 0;
  const out: Record<string, unknown> = { date: DATE };

  for (const target of TARGETS) {
    const s = await backlinksSummary(target, common);
    cost += s.cost ?? 0;
    const sr = (s.data?.tasks?.[0]?.result as Array<Record<string, unknown>> | undefined)?.[0] ?? {};
    const summary = Object.fromEntries(SUMMARY_KEYS.map((k) => [k, sr[k]]));
    console.log(`\n=== ${target} ===`);
    for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${JSON.stringify(v)}`);

    const r = await referringDomains(target, { ...common, limit: 100, backlinksStatusType: "live" });
    cost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result as Array<{ items?: RefRow[] }> | undefined)?.[0]?.items ?? []) as RefRow[];
    const rows = items.map((i) => ({
      domain: i.domain,
      rank: i.rank,
      backlinks: i.backlinks,
      spam: i.backlinks_spam_score,
      first_seen: (i.first_seen ?? "").slice(0, 10),
    }));
    console.log(`  referring domains returned: ${rows.length}`);
    for (const row of rows.slice(0, 40)) console.log(`    ${row.domain} | rank=${row.rank} | links=${row.backlinks} | spam=${row.spam} | ${row.first_seen}`);
    out[target] = { summary, referringDomains: rows };
  }

  const file = path.join(REPO_ROOT, "seo-data", "exports", `domain-strength-compare-${DATE}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2), "utf8");
  console.log(`\nWrote ${path.relative(REPO_ROOT, file)}\nTotal actual API-reported cost: $${cost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
