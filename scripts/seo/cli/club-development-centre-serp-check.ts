// Follow-up to club-development-centre-research.ts: for the top-ranked
// candidate clubs by combined search volume, pull the real Google SERP
// (organic top results + People Also Ask + related searches) for each
// club's single highest-volume phrasing, to sanity-check search intent
// (is "<club> youth academy" actually parent/pathway intent, or something
// else entirely) and see who currently ranks / what questions searchers
// are asking, before recommending which club to write next.
//
// One SERP request per club (this endpoint can't batch keywords - see
// dataforseo/endpoints/serp.ts), depth 10 (PAA/related searches don't need
// deep results, matches the depth used by the other single-keyword SERP
// checks in this directory, e.g. coach-serp-check.ts).
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/club-development-centre-serp-check.ts
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

const TARGETS: Array<{ club: string; league: string; keyword: string; totalVolume: number }> = [
  { club: "Leeds United", league: "Premier League", keyword: "Leeds United youth academy", totalVolume: 1040 },
  { club: "Brentford", league: "Premier League", keyword: "Brentford academy trials", totalVolume: 330 },
  { club: "Aston Villa", league: "Premier League", keyword: "Aston Villa academy trials", totalVolume: 280 },
  { club: "Watford", league: "Championship", keyword: "Watford academy trials", totalVolume: 220 },
  { club: "Manchester United", league: "Premier League", keyword: "Manchester United academy trials", totalVolume: 180 },
  { club: "Charlton Athletic", league: "Championship", keyword: "Charlton Athletic academy trials", totalVolume: 170 },
  { club: "Coventry City", league: "Premier League", keyword: "Coventry City academy trials", totalVolume: 160 },
  { club: "Millwall", league: "Championship", keyword: "Millwall academy trials", totalVolume: 160 },
  { club: "Southampton", league: "Championship", keyword: "Southampton academy trials", totalVolume: 150 },
  { club: "Manchester City", league: "Premier League", keyword: "Manchester City youth academy", totalVolume: 140 },
  { club: "Wrexham", league: "Championship", keyword: "Wrexham academy trials", totalVolume: 140 },
];

async function main() {
  ensureEnvLoaded();
  migrate();

  const liveReady = process.env.LIVE_CONFIRM === "yes";
  console.log(`${TARGETS.length} SERP checks planned, depth 10, ~$0.002-0.004 each:`);
  TARGETS.forEach((t) => console.log(`  ${t.club} (${t.league})  ->  "${t.keyword}"  [cluster total ${t.totalVolume}/mo]`));
  if (!liveReady) {
    console.log("\nNot sending - requires LIVE_CONFIRM=yes for this invocation.");
    return;
  }

  let totalCost = 0;

  for (const target of TARGETS) {
    const result = await googleOrganicSerp(target.keyword, {
      workflow: "club-development-centre-serp-check",
      environment: "live",
      confirmLive: true,
      depth: 10,
    });
    totalCost += result.cost ?? 0;

    console.log(`\n${"=".repeat(78)}`);
    console.log(`${target.club} (${target.league})  ->  "${target.keyword}"  [cluster total ${target.totalVolume}/mo]`);

    if (result.error || !result.data) {
      console.log(`ERROR: ${result.error}`);
      continue;
    }

    const items = ((result.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
    const { aiOverview, paaQuestions, relatedSearches } = extractSerpFeatures(items);

    const organic = items.filter((it) => it.type === "organic").slice(0, 5) as Array<SerpItem & { url?: string; domain?: string }>;
    console.log("Top organic results:");
    for (const o of organic) {
      console.log(`  - ${(o as any).domain ?? (o as any).url ?? "?"}  "${o.title ?? ""}"`);
    }

    console.log(`AI Overview present: ${aiOverview ? "yes" : "no"}`);
    console.log(`People Also Ask: ${paaQuestions.length ? paaQuestions.join(" | ") : "(none)"}`);
    console.log(`Related searches: ${relatedSearches.length ? relatedSearches.join(", ") : "(none)"}`);
  }

  console.log(`\nTotal SERP spend this run: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
