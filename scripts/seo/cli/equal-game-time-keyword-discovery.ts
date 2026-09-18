// Proper keyword discovery for the "equal game time / playing time
// calculator" cluster, redone after this morning's audit tested the wrong
// (too-long) phrasings and missed real volume on shorter variants. Follows
// the seo-content skill's discover -> shortlist -> enrich sequence: broad
// Labs discovery first, then the canonical Google Ads volume endpoint only
// on the shortlist, plus search-intent classification (to check whether
// "app"/"tracker"-style queries lean toward tool/app intent - relevant to
// positioning the Coach App as a season-long equal-game-time calculator).
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/equal-game-time-keyword-discovery.ts
import { migrate } from "../database/migrate";
import { keywordIdeas, relatedKeywords, searchIntent } from "../dataforseo/endpoints/labs";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const IDEA_SEEDS = [
  "game time football",
  "playing time calculator",
  "equal playing time calculator",
  "substitution calculator football",
  "football team rotation app",
];
const RELATED_SEEDS = ["playing time calculator", "game time football"];

const RELEVANT_PATTERN = /calculator|rotation|substitut|game time|playing time|playtime|lineup|line up|team sheet|tracker|app|season/i;

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: 1 keyword_ideas (5 seeds, limit 300), 2 related_keywords calls, then canonical google_ads_search_volume + search_intent on the shortlist. Rough estimated cost: ~$0.35.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "equal-game-time-keyword-discovery", environment: "live" as const, confirmLive: true };

  type Idea = { keyword?: string; keyword_info?: { search_volume?: number | null } };
  const candidates = new Map<string, number | null>();

  console.log("\n=== keyword_ideas (broad discovery) ===");
  const ideas = await keywordIdeas(IDEA_SEEDS, { ...common, limit: 300 });
  totalCost += ideas.cost ?? 0;
  if (ideas.error || !ideas.data) {
    console.log(`ERROR: ${ideas.error}`);
  } else {
    const items = (ideas.data.tasks?.[0]?.result as Array<{ items?: Idea[] }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} ideas returned.`);
    for (const r of rows) {
      if (r.keyword && RELEVANT_PATTERN.test(r.keyword)) candidates.set(r.keyword.toLowerCase(), r.keyword_info?.search_volume ?? null);
    }
  }

  for (const seed of RELATED_SEEDS) {
    console.log(`\n=== related_keywords: "${seed}" ===`);
    const related = await relatedKeywords(seed, { ...common, limit: 100 });
    totalCost += related.cost ?? 0;
    if (related.error || !related.data) {
      console.log(`ERROR: ${related.error}`);
      continue;
    }
    const items = (related.data.tasks?.[0]?.result as Array<{ items?: Array<{ keyword_data?: Idea }> }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} related keywords returned.`);
    for (const r of rows) {
      const kw = r.keyword_data?.keyword;
      if (kw && RELEVANT_PATTERN.test(kw)) candidates.set(kw.toLowerCase(), r.keyword_data?.keyword_info?.search_volume ?? null);
    }
  }

  const shortlist = [...candidates.keys()].slice(0, 60);
  console.log(`\n=== Relevance-filtered shortlist (${shortlist.length} of ${candidates.size} total candidates) ===`);
  for (const k of shortlist) console.log(`  ${k} | labs vol=${candidates.get(k) ?? "n/a"}`);

  if (shortlist.length > 0) {
    console.log(`\n=== Canonical Google Ads search volume on the shortlist ===`);
    const canonical = await googleAdsSearchVolume(shortlist, common);
    totalCost += canonical.cost ?? 0;
    if (canonical.error || !canonical.data) {
      console.log(`ERROR: ${canonical.error}`);
    } else {
      const rows = (canonical.data.tasks?.[0]?.result as Array<{ keyword?: string; search_volume?: number | null; cpc?: number | null; competition?: string | null }> | undefined) ?? [];
      const sorted = [...rows].sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0));
      for (const r of sorted) {
        console.log(`  ${r.search_volume ?? "null"}  ${r.keyword}  (cpc=${r.cpc ?? "n/a"}, competition=${r.competition ?? "n/a"})`);
      }
    }

    console.log(`\n=== Search intent on shortlist terms with real volume ===`);
    const withVolume = shortlist; // classify the whole shortlist; cheap relative to the rest
    const intent = await searchIntent(withVolume, common);
    totalCost += intent.cost ?? 0;
    if (intent.error || !intent.data) {
      console.log(`ERROR: ${intent.error}`);
    } else {
      const rows = (intent.data.tasks?.[0]?.result as Array<{ keyword?: string; keyword_intent?: { label?: string; probability?: number } }> | undefined) ?? [];
      for (const r of rows) {
        console.log(`  ${r.keyword} | intent=${r.keyword_intent?.label ?? "n/a"} (p=${r.keyword_intent?.probability?.toFixed?.(2) ?? "n/a"})`);
      }
    }
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
