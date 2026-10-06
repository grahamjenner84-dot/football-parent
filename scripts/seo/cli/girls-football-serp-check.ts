// Step 5 of the girls' football research (2026-10-06): live UK page one for
// the shortlisted girls' football terms, to judge real competition (who
// ranks: governing bodies, clubs, big publishers, or forums and thin local
// pages) plus People Also Ask and related searches for content angles.
// SAFETY: three-factor live gate; Graham approved in-session 2026-10-06.
// Run: LIVE_CONFIRM=yes npx tsx scripts/seo/cli/girls-football-serp-check.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const KEYWORDS = [
  "girls football",
  "football for girls",
  "girls football league",
  "girls football academy",
  "girls football age groups",
  "can girls play in boys football teams",
  "girls football training",
  "girls football trials",
  "how to get my daughter into football",
  "wildcats football",
  "arsenal girls academy trials",
  "leeds united girls academy",
  "crystal palace girls academy",
];

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let cost = 0;
  const out: Record<string, unknown> = {};
  for (const kw of KEYWORDS) {
    const r = await googleOrganicSerp(kw, { workflow: "girls-football-serp-check", environment: "live", confirmLive: true, depth: 20 });
    cost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? []) as (SerpItem & { rank_group?: number; domain?: string; url?: string })[];
    const organic = items.filter((i) => i.type === "organic").slice(0, 10).map((i) => ({ rank: i.rank_group, domain: i.domain, title: i.title, url: i.url }));
    const features = [...new Set(items.filter((i) => i.type !== "organic").map((i) => i.type))];
    const f = extractSerpFeatures(items);
    out[kw] = { features, organic, paa: f.paaQuestions, related: f.relatedSearches };
    console.log(`\n=== ${kw} === features: ${features.join(", ")}`);
    for (const o of organic) console.log(`  #${o.rank} ${o.domain}  ${o.title}`);
    if (f.paaQuestions.length) console.log(`  PAA: ${f.paaQuestions.join(" | ")}`);
    if (f.relatedSearches.length) console.log(`  related: ${f.relatedSearches.join(" | ")}`);
  }
  writeFileSync("seo-data/exports/girls-football-serp-check-2026-10-06.json", JSON.stringify(out, null, 2));
  console.log(`\nTotal cost $${cost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
