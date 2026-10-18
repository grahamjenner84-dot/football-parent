// Second-round SERPs for base layer research (2026-10-12): the football-specific
// terms that round one showed carry the real volume. Approved in-session.
// Run: DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/base-layer-serp-2.ts
import { readFileSync, writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";
ensureEnvLoaded();
const OUT = "seo-data/exports/base-layer-research-2026-10-12.json";
const TERMS = ["football skins", "childrens base layer football", "football skins for juniors", "under armour for football", "snood football"];
async function main() {
  migrate();
  if (!(process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes")) { console.log("Not sending - live gate not set."); return; }
  const d = JSON.parse(readFileSync(OUT, "utf8"));
  let cost = 0;
  for (const kw of TERMS) {
    const r = await googleOrganicSerp(kw, { workflow: "base-layer-research", environment: "live", confirmLive: true, depth: 20 });
    cost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? []) as (SerpItem & { rank_group?: number; domain?: string; url?: string })[];
    const organic = items.filter((i) => i.type === "organic").slice(0, 10).map((i) => ({ rank: i.rank_group, domain: i.domain, title: i.title, url: i.url }));
    const features = [...new Set(items.filter((i) => i.type !== "organic").map((i) => i.type))];
    const f = extractSerpFeatures(items);
    d.serps[kw] = { features, organic, paa: f.paaQuestions, related: f.relatedSearches };
    console.log(`\n== ${kw} ${features.join(",")}`);
    for (const o of organic) console.log(` #${o.rank} ${o.domain} | ${(o.title || "").slice(0, 70)}`);
    console.log(` PAA: ${f.paaQuestions.join(" | ")}`); console.log(` rel: ${f.relatedSearches.join(" | ")}`);
  }
  d.totalCost += cost;
  writeFileSync(OUT, JSON.stringify(d, null, 2));
  console.log(`round 2 cost $${cost.toFixed(4)}, total $${d.totalCost.toFixed(4)}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
