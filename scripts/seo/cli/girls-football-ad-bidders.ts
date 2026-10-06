// Who bids on girls' football searches (2026-10-06), to shortlist potential
// sponsors for the girls' section. Two sources:
//   1. Live Google results, mobile and desktop, for commercial girls' terms,
//      capturing every paid / shopping advertiser on the page.
//   2. Labs serp_competitors with item_types ["paid"] across the wider
//      girls' keyword set: domains seen in paid results in Labs' index.
// Ads rotate per search, so (1) is a snapshot, not a complete list.
// SAFETY: three-factor live gate; Graham approved in-session 2026-10-06.
// Run: LIVE_CONFIRM=yes npx tsx scripts/seo/cli/girls-football-ad-bidders.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { dataForSeoRequest } from "../dataforseo/client";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded } from "../shared/env";
import { DEFAULT_LOCATION_CODE, DEFAULT_LANGUAGE_CODE } from "../shared/normalise";

ensureEnvLoaded();
const WORKFLOW = "girls-football-ad-bidders";

const SERP_TERMS = [
  "girls football camps", "girls football holiday camp", "girls football academy near me", "girls football club near me",
  "girls football training near me", "girls football trials", "girls football boots", "girls football kit",
  "women's football near me", "women's football academy", "football camps for girls", "girls football coaching",
  "girls football sessions", "girls football scholarship", "girls shin pads",
];

const LABS_TERMS = [
  ...SERP_TERMS,
  "girls football", "football for girls", "girls football club", "girls football academy", "girls football training",
  "wildcats football", "fa wildcats", "ladies football near me", "women's football clubs near me", "women's football teams near me",
  "girls football teams near me", "football trials for girls", "best football boots for girls", "girls goalkeeper gloves",
  "football gifts for girls", "sports bra for football", "girls futsal", "football scholarship girls uk", "girls football college",
  "soccer scholarship usa girls",
];

type Item = { type: string; domain?: string; title?: string; url?: string; description?: string; items?: { domain?: string; title?: string; seller?: string; source?: string }[] };

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let cost = 0;
  const hits: { term: string; device: string; type: string; advertiser: string; title: string; url?: string }[] = [];

  for (const term of SERP_TERMS) {
    for (const device of ["mobile", "desktop"] as const) {
      const r = await googleOrganicSerp(term, { workflow: WORKFLOW, environment: "live", confirmLive: true, depth: 10, device });
      cost += r.cost ?? 0;
      const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: Item[] } | undefined)?.items ?? []);
      for (const it of items) {
        if (it.type === "paid") hits.push({ term, device, type: "paid", advertiser: it.domain ?? "?", title: it.title ?? "", url: it.url });
        if (it.type === "shopping" || it.type === "popular_products" || it.type === "commercial_units") {
          for (const s of it.items ?? []) hits.push({ term, device, type: it.type, advertiser: s.seller ?? s.source ?? s.domain ?? "?", title: s.title ?? "" });
        }
      }
      const n = items.filter((i) => ["paid", "shopping", "popular_products", "commercial_units"].includes(i.type)).length;
      console.log(`${term.padEnd(36)} ${device.padEnd(7)} ad blocks: ${n}`);
    }
  }

  const body = { keywords: LABS_TERMS, location_code: DEFAULT_LOCATION_CODE, language_code: DEFAULT_LANGUAGE_CODE, item_types: ["paid"], limit: 100 };
  const labs = await dataForSeoRequest({
    workflow: WORKFLOW, apiFamily: "dataforseo_labs", cacheFamily: "competitor_rankings",
    endpoint: "dataforseo_labs/google/serp_competitors/live", body, environment: "live", confirmLive: true,
    seedTerms: LABS_TERMS, locationCode: body.location_code, languageCode: body.language_code, limit: 100,
  });
  cost += labs.cost ?? 0;
  const labsItems = ((labs.data?.tasks?.[0]?.result?.[0] as { items?: { domain: string; keywords_count?: number; etv?: number; visibility?: number; keywords_positions?: Record<string, number[]> }[] } | undefined)?.items ?? []);
  console.log(`\nLabs serp_competitors (paid): ${labsItems.length} domains, error=${labs.error ?? "none"} ${labs.data?.tasks?.[0]?.status_message ?? ""}`);
  for (const d of labsItems.slice(0, 40)) console.log(`  ${d.domain.padEnd(40)} keywords ${d.keywords_count}  ${Object.keys(d.keywords_positions ?? {}).slice(0, 6).join("; ")}`);

  console.log(`\n=== Live ad advertisers (${hits.length} ad slots) ===`);
  const byAdv = new Map<string, Set<string>>();
  for (const h of hits) {
    const k = `${h.advertiser} [${h.type}]`;
    if (!byAdv.has(k)) byAdv.set(k, new Set());
    byAdv.get(k)!.add(h.term);
  }
  for (const [k, terms] of [...byAdv].sort((a, b) => b[1].size - a[1].size)) console.log(`  ${k.padEnd(50)} ${[...terms].join("; ")}`);
  for (const h of hits.filter((h) => h.type === "paid")) console.log(`    paid: ${h.advertiser} | ${h.title} | ${h.term} (${h.device})`);

  writeFileSync("seo-data/exports/girls-football-ad-bidders-2026-10-06.json", JSON.stringify({ liveAds: hits, labsPaidCompetitors: labsItems }, null, 2));
  console.log(`\nTotal cost $${cost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
