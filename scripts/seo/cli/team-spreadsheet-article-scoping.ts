// Full scoping pass for the planned "football/soccer team spreadsheet"
// article (pages.id 4539, upgraded Low->Medium priority on 2026-09-06
// after mingle.sport's ranked keywords surfaced real volume on this
// phrasing). Follows the seo-page skill's step 4/6 pattern: live SERP for
// who's-currently-ranking + AI Overview citation + PAA (candidate FAQs) +
// related_searches, then Labs keywordSuggestions/relatedKeywords widening,
// then bulkKeywordDifficulty on the combined shortlist.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/team-spreadsheet-article-scoping.ts
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { keywordSuggestions, relatedKeywords, bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { extractSerpFeatures, citationSummary, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const PRIMARY_TERMS = ["football team spreadsheet", "soccer team spreadsheet"];
const RELEVANT_PATTERN = /spreadsheet|template|excel|google sheet|stats|tracker|calculator|rotation|substitut|lineup|team sheet|app\b/i;

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: 2 SERP live checks (depth 30) for "${PRIMARY_TERMS.join('", "')}", 1 keyword_suggestions + 1 related_keywords for widening, 1 bulk_keyword_difficulty on the shortlist. Rough estimated cost: ~$0.15.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "team-spreadsheet-article-scoping", environment: "live" as const, confirmLive: true };
  const paaAll = new Set<string>();
  const relatedAll = new Set<string>();
  const competitorDomainsAll = new Set<string>();

  for (const term of PRIMARY_TERMS) {
    console.log(`\n\n########## SERP: "${term}" ##########`);
    const serp = await googleOrganicSerp(term, { ...common, depth: 30 });
    totalCost += serp.cost ?? 0;
    if (serp.error || !serp.data) {
      console.log(`ERROR: ${serp.error}`);
      continue;
    }
    const items = (serp.data.tasks?.[0]?.result as Array<{ items?: SerpItem[] }> | undefined) ?? [];
    const allItems = items[0]?.items ?? [];

    const organic = (allItems as any[]).filter((r) => r.type === "organic").slice(0, 15);
    console.log(`\nTop organic (who's ranking):`);
    for (const r of organic) console.log(`  #${r.rank_absolute} ${r.domain} | ${r.title}`);

    const features = extractSerpFeatures(allItems);
    if (features.aiOverview) {
      const cite = citationSummary(features.aiOverview.references);
      console.log(`\nAI Overview: present. footballparent.co.uk cited: ${cite.cited} (position ${cite.position ?? "n/a"}). Competitor domains cited: ${cite.competitorDomains.join(", ") || "none"}`);
      cite.competitorDomains.forEach((d) => competitorDomainsAll.add(d));
    } else {
      console.log(`\nAI Overview: not present on this SERP.`);
    }

    console.log(`\nPeople Also Ask (${features.paaQuestions.length}):`);
    for (const q of features.paaQuestions) {
      console.log(`  - ${q}`);
      paaAll.add(q);
    }

    console.log(`\nRelated searches (${features.relatedSearches.length}):`);
    for (const r of features.relatedSearches) {
      console.log(`  - ${r}`);
      relatedAll.add(r);
    }

    organic.forEach((r) => r.domain && competitorDomainsAll.add(r.domain.replace(/^www\./, "")));
  }

  console.log(`\n\n########## Keyword widening ##########`);
  const candidates = new Map<string, number | null>();
  const suggestions = await keywordSuggestions("football team spreadsheet", { ...common, limit: 200 });
  totalCost += suggestions.cost ?? 0;
  if (!suggestions.error && suggestions.data) {
    const items = (suggestions.data.tasks?.[0]?.result as Array<{ items?: Array<{ keyword?: string; keyword_info?: { search_volume?: number | null } }> }> | undefined) ?? [];
    for (const r of items[0]?.items ?? []) {
      if (r.keyword && RELEVANT_PATTERN.test(r.keyword)) candidates.set(r.keyword.toLowerCase(), r.keyword_info?.search_volume ?? null);
    }
    console.log(`keyword_suggestions: ${items[0]?.items?.length ?? 0} returned, ${candidates.size} relevance-filtered so far.`);
  } else {
    console.log(`keyword_suggestions ERROR: ${suggestions.error}`);
  }

  const related = await relatedKeywords("football team spreadsheet", { ...common, limit: 100 });
  totalCost += related.cost ?? 0;
  if (!related.error && related.data) {
    const items = (related.data.tasks?.[0]?.result as Array<{ items?: Array<{ keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number | null } } }> }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    for (const r of rows) {
      const kw = r.keyword_data?.keyword;
      if (kw && RELEVANT_PATTERN.test(kw)) candidates.set(kw.toLowerCase(), r.keyword_data?.keyword_info?.search_volume ?? null);
    }
    console.log(`related_keywords: ${rows.length} returned, ${candidates.size} relevance-filtered total now.`);
  } else {
    console.log(`related_keywords ERROR: ${related.error}`);
  }

  const knownGood = ["football team spreadsheet", "soccer team spreadsheet", "team stats", "apps for football stats", "football team stats app", "grassroots football app", "football team management app"];
  knownGood.forEach((k) => candidates.set(k, candidates.get(k) ?? null));

  const shortlist = [...candidates.keys()].slice(0, 50);
  console.log(`\nFinal shortlist (${shortlist.length}):`);
  for (const k of shortlist) console.log(`  ${k} | labs vol=${candidates.get(k) ?? "n/a"}`);

  console.log(`\n\n########## Keyword difficulty on shortlist ##########`);
  const kd = await bulkKeywordDifficulty(shortlist, common);
  totalCost += kd.cost ?? 0;
  if (kd.error || !kd.data) {
    console.log(`ERROR: ${kd.error}`);
  } else {
    const results = (kd.data.tasks?.[0]?.result as Array<{ items?: Array<{ keyword?: string; keyword_difficulty?: number | null }> }> | undefined) ?? [];
    const rows = results[0]?.items ?? [];
    const sorted = [...rows].sort((a, b) => (a.keyword_difficulty ?? 999) - (b.keyword_difficulty ?? 999));
    for (const r of sorted) console.log(`  KD ${r.keyword_difficulty ?? "n/a"}  ${r.keyword}`);
  }

  console.log(`\n\n########## Summary sets ##########`);
  console.log(`All competitor domains seen across both SERPs (${competitorDomainsAll.size}): ${[...competitorDomainsAll].join(", ")}`);
  console.log(`All unique PAA questions (${paaAll.size}):`);
  for (const q of paaAll) console.log(`  - ${q}`);
  console.log(`All unique related searches (${relatedAll.size}):`);
  for (const r of relatedAll) console.log(`  - ${r}`);

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
