// Slug research for /parent-guides/support-child-after-bad-match (2026-10-03).
// The page has sat in "Discovered - currently not indexed" since May; its slug
// says "after bad match" but the article is about a sustained dip in form,
// confidence and wanting to quit. This finds the phrasing parents actually
// search for that topic, so the page can move to a slug that matches it.
//
// Run (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/child-struggling-slug-research.ts
import { migrate } from "../database/migrate";
import { relatedKeywords, keywordSuggestions, bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";

const WORKFLOW = "child-struggling-slug-research";

const CANDIDATES = [
  "child struggling in football",
  "child struggling at football",
  "my child is struggling at football",
  "child lost confidence in football",
  "child losing confidence in football",
  "my child has lost confidence in football",
  "how to help child lost confidence football",
  "child lost confidence in sport",
  "child lost interest in football",
  "child losing interest in football",
  "my child wants to quit football",
  "child wants to quit football",
  "son wants to quit football",
  "my son wants to quit football",
  "should i let my child quit football",
  "child doesn't want to go to football",
  "child doesn't want to go to football training",
  "my child doesn't want to play football anymore",
  "child playing badly football",
  "child bad form football",
  "loss of form football child",
  "confidence in football child",
  "how to support child after bad football match",
  "support child after bad game",
  "child bad game football",
  "my child had a bad game",
  "football confidence dip",
  "youth football confidence",
  "son lost confidence in football",
  "child not enjoying football",
];

function rowsOf(items: any[]) {
  return items
    .map((it) => {
      const kd = it.keyword_data ?? it;
      return { keyword: kd.keyword as string, vol: kd.keyword_info?.search_volume ?? null, kd: kd.keyword_properties?.keyword_difficulty ?? null };
    })
    .filter((r) => r.keyword)
    .sort((a, b) => (b.vol ?? -1) - (a.vol ?? -1));
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

  for (const seed of ["child lost confidence in football", "child wants to quit football"]) {
    const r = await relatedKeywords(seed, { ...opts, limit: 100 });
    spend += r.cost ?? 0;
    const rows = rowsOf(((r.data?.tasks?.[0] as any)?.result?.[0]?.items ?? []) as any[]);
    console.log(`\n=== related_keywords: ${seed} (${rows.length}) ===`);
    for (const x of rows.slice(0, 40)) console.log(`${String(x.vol ?? "null").padStart(6)}  KD ${String(x.kd ?? "-").padStart(3)}  ${x.keyword}`);
  }

  for (const seed of ["quit football", "confidence in football"]) {
    const r = await keywordSuggestions(seed, { ...opts, limit: 100 });
    spend += r.cost ?? 0;
    const rows = rowsOf(((r.data?.tasks?.[0] as any)?.result?.[0]?.items ?? []) as any[]);
    console.log(`\n=== keyword_suggestions: ${seed} (${rows.length}) ===`);
    for (const x of rows.slice(0, 40)) console.log(`${String(x.vol ?? "null").padStart(6)}  KD ${String(x.kd ?? "-").padStart(3)}  ${x.keyword}`);
  }

  const vol = await googleAdsSearchVolume(CANDIDATES, opts);
  spend += vol.cost ?? 0;
  const volItems = ((vol.data?.tasks?.[0] as any)?.result ?? []) as any[];
  console.log(`\n=== Google Ads volume (UK) ===`);
  for (const it of volItems.sort((a, b) => (b.search_volume ?? -1) - (a.search_volume ?? -1)))
    console.log(`${String(it.search_volume ?? "null").padStart(6)}  ${it.keyword}`);

  const withVol = volItems.filter((i) => (i.search_volume ?? 0) > 0).map((i) => i.keyword);
  if (withVol.length) {
    const kd = await bulkKeywordDifficulty(withVol, opts);
    spend += kd.cost ?? 0;
    console.log(`\n=== KD ===`);
    for (const it of (((kd.data?.tasks?.[0] as any)?.result?.[0]?.items ?? []) as any[]))
      console.log(`KD ${String(it.keyword_difficulty ?? "-").padStart(3)}  ${it.keyword}`);
  }

  for (const q of ["my child wants to quit football", "child lost confidence in football"]) {
    const s = await googleOrganicSerp(q, { ...opts, depth: 10 } as any);
    spend += s.cost ?? 0;
    const items = ((s.data?.tasks?.[0] as any)?.result?.[0]?.items ?? []) as any[];
    console.log(`\n=== SERP: ${q} ===`);
    for (const it of items) {
      if (it.type === "organic") console.log(`#${it.rank_group}  ${it.domain}  ${it.title}`);
      else if (it.type === "people_also_ask") for (const p of it.items ?? []) console.log(`PAA: ${p.title}`);
      else if (it.type === "ai_overview") console.log(`[AI Overview present]`);
    }
  }

  console.log(`\nTotal spend: $${spend.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
