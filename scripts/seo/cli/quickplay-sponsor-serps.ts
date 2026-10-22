// Round 2 of the QuickPlay sponsorship research (see
// quickplay-sponsor-research.ts): Google Ads volume on review/comparison
// phrasings that Labs has no data for, then a live top-20 SERP on each
// shortlisted term to see whether editorial pages rank or it is all shops.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/quickplay-sponsor-serps.ts <outPath>
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const VOLUME_TERMS = [
  "quickplay review",
  "quickplay reviews",
  "quickplay goals review",
  "kickster goal review",
  "quickplay vs forza",
  "forza vs quickplay",
  "football training equipment for kids",
  "football training equipment for home",
  "football training equipment for garden",
  "football training at home",
  "indoor football training for kids",
  "football drills at home",
  "goalkeeper training equipment for kids",
  "football skills mat",
  "how to use a ball mastery mat",
  "ball mastery drills",
  "football reaction training",
  "ball stop netting for football",
  "best football training equipment",
  "football training kit for kids",
];

const SERP_TERMS = [
  "quickplay discount code",
  "quickplay review",
  "ball stop netting for gardens",
  "ball stop netting",
  "ball mastery mat",
  "footwork ball mastery mat",
  "indoor football training",
  "football training equipment for kids",
  "goalkeeper rebounder",
  "goalkeeper training equipment",
  "football target nets",
  "best pop up football goals",
  "football reaction lights",
  "football training at home",
];

type SerpItem = { type?: string; rank_absolute?: number; domain?: string; title?: string; url?: string };

async function main() {
  migrate();
  const out = process.argv[2] ?? "quickplay-round2.json";
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 1 search_volume call (${VOLUME_TERMS.length} terms) + ${SERP_TERMS.length} SERPs at depth 20. Rough cost ~$0.15.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const live = { workflow: "quickplay-sponsor-serps", environment: "live" as const, confirmLive: true };
  let cost = 0;

  // Google Ads volume rate-limits (task 50301) more readily than the rest;
  // retry once after a pause, then carry on to the SERPs without it.
  let vol = await googleAdsSearchVolume(VOLUME_TERMS, live);
  if (vol.error || !vol.data) {
    console.log(`search_volume failed (${vol.error}), retrying in 20s`);
    await new Promise((r) => setTimeout(r, 20000));
    vol = await googleAdsSearchVolume(VOLUME_TERMS, live);
  }
  if (vol.error || !vol.data) console.log(`search_volume failed again (${vol.error}), skipping volumes`);
  cost += vol.cost ?? 0;
  const volumes = ((vol.data?.tasks?.[0]?.result as Array<{ keyword?: string; search_volume?: number | null; cpc?: number | null; competition?: string | null }> | undefined) ?? []).map((r) => ({
    keyword: r.keyword,
    volume: r.search_volume ?? null,
    cpc: r.cpc ?? null,
    competition: r.competition ?? null,
  }));

  const serps: Record<string, { features: string[]; organic: SerpItem[] }> = {};
  for (const term of SERP_TERMS) {
    const res = await googleOrganicSerp(term, { ...live, depth: 20 });
    if (res.error || !res.data) {
      console.log(`SERP failed for ${term}: ${res.error}`);
      continue;
    }
    cost += res.cost ?? 0;
    const items = ((res.data.tasks?.[0]?.result as Array<{ items?: SerpItem[] }> | undefined)?.[0]?.items) ?? [];
    serps[term] = {
      features: [...new Set(items.map((i) => i.type ?? "").filter((t) => t && t !== "organic"))],
      organic: items
        .filter((i) => i.type === "organic")
        .map((i) => ({ rank_absolute: i.rank_absolute, domain: i.domain, title: i.title, url: i.url })),
    };
  }

  writeFileSync(out, JSON.stringify({ volumes, serps }, null, 2));
  console.log(`Wrote ${out}. Cost: $${cost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
