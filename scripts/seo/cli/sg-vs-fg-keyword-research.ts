// Long-tail keyword research for the planned soft-ground-vs-firm-ground
// kids boots article (2026-09-27). Builds on the 2026-09-19 pull recorded in
// the pages tracker notes, which established the bare "soft ground football
// boots" head term is adult/mens intent. This round looks for the specific,
// question-shaped and kids-specific phrasings instead: Labs related/suggestion
// trees off the comparison seeds, Google Ads volume for a hand-built list of
// question variants (several seeded from real GSC queries the existing
// ag-vs-fg-boots page already gets impressions for), and SERP + PAA for the
// two comparison phrasings.
//
// Run (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/sg-vs-fg-keyword-research.ts
import { migrate } from "../database/migrate";
import { relatedKeywords, keywordSuggestions, bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { upsertKeywordWithMetrics } from "../dataforseo/persist-results";

const WORKFLOW = "sg-vs-fg-keyword-research";

const QUESTION_KEYWORDS = [
  "soft ground vs firm ground boots",
  "firm ground vs soft ground football boots",
  "sg vs fg boots",
  "fg vs sg boots",
  "sg vs fg",
  "difference between soft ground and firm ground boots",
  "difference between soft ground and hard ground boots",
  "difference between sg and fg boots",
  "what are soft ground boots",
  "what are sg boots",
  "what are sg football boots",
  "when to wear soft ground boots",
  "when to wear soft ground football boots",
  "when to use soft ground boots",
  "do i need soft ground boots",
  "does my child need soft ground boots",
  "are soft ground boots allowed in kids football",
  "can kids wear metal studs",
  "can kids wear screw in studs",
  "metal studs age limit football",
  "what age can you wear metal studs",
  "can you wear soft ground boots on 3g",
  "can you wear soft ground boots on astroturf",
  "can you wear soft ground boots on artificial grass",
  "can you wear sg boots on 3g",
  "can you wear firm ground boots on soft ground",
  "fg boots on wet grass",
  "football boots for muddy pitches",
  "football boots for wet grass",
  "best boots for muddy pitches",
  "kids soft ground football boots",
  "junior soft ground football boots",
  "junior football boots for soft ground",
  "childrens soft ground football boots",
  "soft ground football boots kids",
  "best soft ground football boots",
  "best kids soft ground football boots",
  "sg pro football boots",
  "mixed studs football boots",
  "hybrid stud football boots",
  "screw in studs vs moulded studs",
  "moulded studs vs screw in studs",
  "anti clog football boots",
  "soft ground football boots meaning",
  "firm ground football boots meaning",
];

function printLabsItems(label: string, items: any[]) {
  console.log(`\n=== ${label} (${items.length}) ===`);
  const rows = items
    .map((it) => {
      const kd = it.keyword_data ?? it;
      return {
        keyword: kd.keyword as string,
        vol: kd.keyword_info?.search_volume ?? null,
        kd: kd.keyword_properties?.keyword_difficulty ?? null,
      };
    })
    .filter((r) => r.keyword)
    .sort((a, b) => (b.vol ?? -1) - (a.vol ?? -1));
  for (const r of rows) {
    console.log(`${String(r.vol ?? "null").padStart(6)}  KD ${String(r.kd ?? "-").padStart(3)}  ${r.keyword}`);
    if (r.vol != null) {
      try {
        upsertKeywordWithMetrics({ keyword: r.keyword, volume: r.vol, keywordDifficulty: r.kd, source: WORKFLOW, isSandbox: false, rawResponseId: null });
      } catch {
        // persistence is a convenience; the printed output is the record
      }
    }
  }
}

async function main() {
  migrate();
  const live =
    process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!live) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }
  const opts = { workflow: WORKFLOW, confirmLive: true };
  let spend = 0;

  for (const seed of ["soft ground vs firm ground boots", "soft ground football boots kids", "sg vs fg boots"]) {
    const r = await relatedKeywords(seed, { ...opts, limit: 100 });
    spend += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0] as any)?.result?.[0]?.items ?? []) as any[];
    printLabsItems(`related_keywords: ${seed}`, items);
  }

  for (const seed of ["soft ground boots", "soft ground football boots", "metal studs"]) {
    const r = await keywordSuggestions(seed, { ...opts, limit: 150 });
    spend += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0] as any)?.result?.[0]?.items ?? []) as any[];
    printLabsItems(`keyword_suggestions: ${seed}`, items);
  }

  const vol = await googleAdsSearchVolume(QUESTION_KEYWORDS, opts);
  spend += vol.cost ?? 0;
  const volItems = ((vol.data?.tasks?.[0] as any)?.result ?? []) as any[];
  console.log(`\n=== Google Ads volume: question list (${volItems.length}) ===`);
  volItems
    .sort((a, b) => (b.search_volume ?? -1) - (a.search_volume ?? -1))
    .forEach((i) => console.log(`${String(i.search_volume ?? "null").padStart(6)}  ${i.keyword}`));

  const kd = await bulkKeywordDifficulty(QUESTION_KEYWORDS, opts);
  spend += kd.cost ?? 0;
  const kdItems = ((kd.data?.tasks?.[0] as any)?.result?.[0]?.items ?? []) as any[];
  console.log(`\n=== KD: question list ===`);
  kdItems.forEach((i) => console.log(`KD ${String(i.keyword_difficulty ?? "-").padStart(3)}  ${i.keyword}`));

  for (const q of ["sg vs fg boots", "soft ground vs firm ground boots", "can you wear soft ground boots on 3g"]) {
    const s = await googleOrganicSerp(q, { ...opts, depth: 20 });
    spend += s.cost ?? 0;
    const items = ((s.data?.tasks?.[0] as any)?.result?.[0]?.items ?? []) as any[];
    console.log(`\n=== SERP: ${q} ===`);
    for (const it of items) {
      if (it.type === "organic") console.log(`  #${it.rank_group} ${it.domain}  ${it.title}`);
      else if (it.type === "people_also_ask")
        (it.items ?? []).forEach((p: any) => console.log(`  PAA: ${p.title}`));
      else if (it.type === "ai_overview") console.log(`  [AI Overview present]`);
      else if (it.type === "related_searches") (it.items ?? []).forEach((t: string) => console.log(`  Related: ${t}`));
      else console.log(`  [${it.type}]`);
    }
  }

  console.log(`\nTotal spend this run: $${spend.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
