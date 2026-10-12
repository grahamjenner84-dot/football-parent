// Gear research for /football-gear/best-football-boots-for-girls (2026-10-12): live UK page one for
// the girls football boots terms, plus PAA and related searches.
// SAFETY: three-factor live gate; Graham approved gear research for this article 2026-10-12.
// Run: LIVE_CONFIRM=yes npx tsx scripts/seo/cli/girls-football-boots-serp.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const KEYWORDS = [
  "girls football boots",
  "best football boots for girls",
  "pink football boots girls",
  "girls football boots size",
  "do girls need different football boots",
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
    const r = await googleOrganicSerp(kw, { workflow: "girls-football-boots-serp", environment: "live", confirmLive: true, depth: 20 });
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
  writeFileSync("seo-data/exports/girls-football-boots-serp-2026-10-12.json", JSON.stringify(out, null, 2));
  console.log(`\nTotal cost $${cost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
