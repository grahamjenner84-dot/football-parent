// Wider research for the "best grassroots/coaching app" roundup article.
// Builds on the cached SERP checks from 22 Aug (best grassroots football app,
// best football team management app, best football coaching app) and the
// grassroots-app-competitors-ranked-keywords.ts domain pull (Spond, Mingle,
// FA Matchday). This pass:
//   1. relatedKeywords + keywordSuggestions seeded on "best football coaching
//      app" and "best grassroots football app" directly (the 6 Sept run seeded
//      "football team management app"/"grassroots football app" instead and
//      pulled mostly irrelevant live-scores/betting-app noise).
//   2. SERP + AI Overview citation check on untested plausible variants,
//      including ones matching Graham's planned honest-comparison angle
//      (Spond for availability/payments, FootballDNA for drills/sessions,
//      equal-playing-time as our own differentiator).
//   3. domainRankOverview + rankedKeywords for footballdna.co.uk, since the
//      article plans to name it - confirms what it actually ranks for before
//      we characterise it in print.
//   4. bulkKeywordDifficulty across the combined shortlist.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/best-coaching-app-wider-research.ts
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import {
  keywordSuggestions,
  relatedKeywords,
  bulkKeywordDifficulty,
  domainRankOverview,
  rankedKeywords,
} from "../dataforseo/endpoints/labs";
import { extractSerpFeatures, citationSummary, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const SEED_TERMS = ["best football coaching app", "best grassroots football app"];

const SERP_VARIANTS = [
  "best youth football coaching app",
  "best app for youth football coaches",
  "football coaching app uk",
  "best sunday league app",
  "spond vs teamstats",
  "best app for tracking football playing time",
  "best all in one football coaching app",
  "football drills app",
];

const RELEVANT_PATTERN = /\bapp\b|apps\b|software|platform/i;

async function main() {
  migrate();

  const liveReady =
    process.env.DATAFORSEO_ENV === "live" &&
    process.env.DATAFORSEO_ALLOW_LIVE === "true" &&
    process.env.LIVE_CONFIRM === "yes";

  console.log(
    `Plan:\n` +
      `  - ${SEED_TERMS.length} relatedKeywords + ${SEED_TERMS.length} keywordSuggestions calls, seeded on: ${SEED_TERMS.join(", ")}\n` +
      `  - ${SERP_VARIANTS.length} live SERP checks (AI Overview + citations + PAA + related_searches) for: ${SERP_VARIANTS.join(", ")}\n` +
      `  - 1 domainRankOverview + 1 rankedKeywords (limit 200) for footballdna.co.uk\n` +
      `  - 1 bulkKeywordDifficulty call across the combined shortlist\n` +
      `Rough estimated cost: ~$0.15-0.20 (mostly $0.006/SERP-check and $0.01-0.02/labs-call, per prior api_usage rows).`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "best-coaching-app-wider-research", environment: "live" as const, confirmLive: true };
  const candidates = new Map<string, number | null>();

  console.log(`\n\n########## Keyword widening (seeded on real "best X app" phrasing) ##########`);
  for (const seed of SEED_TERMS) {
    const suggestions = await keywordSuggestions(seed, { ...common, limit: 200 });
    totalCost += suggestions.cost ?? 0;
    if (!suggestions.error && suggestions.data) {
      const items =
        (suggestions.data.tasks?.[0]?.result as
          | Array<{ items?: Array<{ keyword?: string; keyword_info?: { search_volume?: number | null } }> }>
          | undefined) ?? [];
      let added = 0;
      for (const r of items[0]?.items ?? []) {
        if (r.keyword && RELEVANT_PATTERN.test(r.keyword)) {
          candidates.set(r.keyword.toLowerCase(), r.keyword_info?.search_volume ?? null);
          added++;
        }
      }
      console.log(`keywordSuggestions("${seed}"): ${items[0]?.items?.length ?? 0} returned, ${added} relevance-filtered added.`);
    } else {
      console.log(`keywordSuggestions("${seed}") ERROR: ${suggestions.error}`);
    }

    const related = await relatedKeywords(seed, { ...common, limit: 100 });
    totalCost += related.cost ?? 0;
    if (!related.error && related.data) {
      const items =
        (related.data.tasks?.[0]?.result as
          | Array<{ items?: Array<{ keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number | null } } }> }>
          | undefined) ?? [];
      const rows = items[0]?.items ?? [];
      let added = 0;
      for (const r of rows) {
        const kw = r.keyword_data?.keyword;
        if (kw && RELEVANT_PATTERN.test(kw)) {
          candidates.set(kw.toLowerCase(), r.keyword_data?.keyword_info?.search_volume ?? null);
          added++;
        }
      }
      console.log(`relatedKeywords("${seed}"): ${rows.length} returned, ${added} relevance-filtered added.`);
    } else {
      console.log(`relatedKeywords("${seed}") ERROR: ${related.error}`);
    }
  }

  console.log(`\nCombined relevance-filtered candidate count so far: ${candidates.size}`);

  console.log(`\n\n########## SERP + AI Overview checks on untested variants ##########`);
  for (const term of SERP_VARIANTS) {
    console.log(`\n--- "${term}" ---`);
    const serp = await googleOrganicSerp(term, { ...common, depth: 20 });
    totalCost += serp.cost ?? 0;
    if (serp.error || !serp.data) {
      console.log(`ERROR: ${serp.error}`);
      continue;
    }
    const items = (serp.data.tasks?.[0]?.result as Array<{ items?: SerpItem[] }> | undefined) ?? [];
    const allItems = items[0]?.items ?? [];
    const organic = (allItems as any[]).filter((r) => r.type === "organic").slice(0, 10);
    console.log(`Top organic:`);
    for (const r of organic) console.log(`  #${r.rank_absolute} ${r.domain} | ${r.title}`);

    const features = extractSerpFeatures(allItems);
    if (features.aiOverview) {
      const cite = citationSummary(features.aiOverview.references);
      console.log(`AI Overview: present. footballparent.co.uk cited: ${cite.cited}. Competitor domains cited: ${cite.competitorDomains.join(", ") || "none"}`);
    } else {
      console.log(`AI Overview: not present.`);
    }
    if (features.paaQuestions.length) console.log(`PAA: ${features.paaQuestions.join(" | ")}`);
    if (features.relatedSearches.length) console.log(`Related: ${features.relatedSearches.join(" | ")}`);

    candidates.set(term, candidates.get(term) ?? null);
  }

  console.log(`\n\n########## footballdna.co.uk profile (named in the planned article) ##########`);
  const fdnaOverview = await domainRankOverview("footballdna.co.uk", common);
  totalCost += fdnaOverview.cost ?? 0;
  if (fdnaOverview.error || !fdnaOverview.data) {
    console.log(`domainRankOverview ERROR: ${fdnaOverview.error}`);
  } else {
    const items =
      (fdnaOverview.data.tasks?.[0]?.result as
        | Array<{ items?: Array<{ metrics?: { organic?: { count?: number; etv?: number; pos_1?: number; pos_2_3?: number } } }> }>
        | undefined) ?? [];
    const metrics = items[0]?.items?.[0]?.metrics?.organic;
    console.log(
      `Domain scale: ranked keywords=${metrics?.count ?? "n/a"}, estimated monthly organic traffic (etv)=${metrics?.etv?.toFixed?.(0) ?? "n/a"}, #1 positions=${metrics?.pos_1 ?? "n/a"}, top-3 positions=${metrics?.pos_2_3 ?? "n/a"}`
    );
  }

  const fdnaRanked = await rankedKeywords("footballdna.co.uk", { ...common, limit: 200, cacheFamily: "competitor_rankings" });
  totalCost += fdnaRanked.cost ?? 0;
  if (fdnaRanked.error || !fdnaRanked.data) {
    console.log(`rankedKeywords ERROR: ${fdnaRanked.error}`);
  } else {
    const items =
      (fdnaRanked.data.tasks?.[0]?.result as
        | Array<{
            items?: Array<{
              keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number } };
              ranked_serp_element?: { serp_item?: { etv?: number; rank_absolute?: number } };
            }>;
          }>
        | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    const sorted = [...rows].sort((a, b) => (b.ranked_serp_element?.serp_item?.etv ?? 0) - (a.ranked_serp_element?.serp_item?.etv ?? 0));
    console.log(`Top 30 ranked keywords by estimated traffic (what footballdna.co.uk is actually known for):`);
    for (const r of sorted.slice(0, 30)) {
      console.log(
        `  ${r.keyword_data?.keyword} | vol=${r.keyword_data?.keyword_info?.search_volume ?? "n/a"} | pos=${r.ranked_serp_element?.serp_item?.rank_absolute ?? "n/a"} | etv=${r.ranked_serp_element?.serp_item?.etv?.toFixed?.(1) ?? "n/a"}`
      );
    }
  }

  console.log(`\n\n########## Keyword difficulty on combined shortlist ##########`);
  const shortlist = [...candidates.keys()].slice(0, 60);
  const kd = await bulkKeywordDifficulty(shortlist, common);
  totalCost += kd.cost ?? 0;
  if (kd.error || !kd.data) {
    console.log(`ERROR: ${kd.error}`);
  } else {
    const results = (kd.data.tasks?.[0]?.result as Array<{ items?: Array<{ keyword?: string; keyword_difficulty?: number | null }> }> | undefined) ?? [];
    const rows = results[0]?.items ?? [];
    const sorted = [...rows].sort((a, b) => (a.keyword_difficulty ?? 999) - (b.keyword_difficulty ?? 999));
    for (const r of sorted) {
      console.log(`  KD ${r.keyword_difficulty ?? "n/a"}  ${r.keyword} | vol=${candidates.get(r.keyword?.toLowerCase() ?? "") ?? "n/a"}`);
    }
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
