// Step 2 of the girls' football research (2026-10-06). Labs discovery
// (girls-football-keyword-discovery.ts) returned ~600 girls' terms but with
// null UK volume on almost all of them - Labs' UK index is thin on this
// niche - so this re-measures them with Google Ads search_volume (one flat
// fee request for up to 1000 keywords) plus a hand-written list of
// parent-intent phrasings, then bulk KD for anything with volume.
// Output: seo-data/exports/girls-football-volume-kd-2026-10-06.json
//
// SAFETY: three-factor live gate; Graham approved in-session 2026-10-06.
// Run:
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/girls-football-volume-kd.ts
import { readFileSync, writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const WORKFLOW = "girls-football-volume-kd";

const HAND_LIST = [
  "girls football", "girls football near me", "girls football club near me", "girls football teams near me",
  "girls football clubs", "girls football team", "girls football teams", "football for girls", "football clubs for girls",
  "girls football academy", "girls football academies", "girls football academy near me", "girls football academy trials",
  "girls football trials", "girls football trials near me", "football trials for girls", "girls academy trials",
  "girls football camps", "girls football camp", "girls football holiday camp", "girls football camps near me",
  "girls football training", "girls football training near me", "girls football coaching", "girls football drills",
  "girls football sessions", "girls football sessions near me", "wildcats football", "wildcats football near me",
  "fa wildcats", "wildcats girls football", "squad girls football", "fa squad girls football", "girls weetabix wildcats",
  "girls football league", "girls football leagues", "girls football tournaments", "girls football tournament",
  "girls football u7", "girls football under 8", "girls football u9", "girls football u10", "girls football u11", "girls football u12",
  "girls football age groups", "what age can girls start football", "what age can girls play football",
  "can girls play on boys football teams", "can girls play in boys football team", "mixed football age limit",
  "mixed football rules", "girls playing in boys teams", "how to get my daughter into football",
  "how to get scouted girls football", "how do girls get scouted", "how to become a female footballer",
  "how to become a professional female footballer", "how to become a professional footballer girl",
  "how to join a girls football academy", "how to get into a girls football academy",
  "wsl academy", "wsl academy trials", "wsl academies", "women's football academy", "girls academy football",
  "arsenal girls academy", "chelsea girls academy", "man city girls academy", "manchester united girls academy",
  "tottenham girls academy", "liverpool girls academy", "everton girls academy", "aston villa girls academy",
  "arsenal girls football", "chelsea girls football", "girls etc", "etc football", "girls rtc", "emerging talent centre",
  "girls emerging talent centre", "player development centre girls", "girls pdc", "fa girls pathway", "girls football pathway",
  "england girls football", "england u15 girls", "england u16 girls", "england u17 women", "england girls squad",
  "girls football scholarships", "girls football scholarship", "football scholarship girls uk", "girls football college",
  "girls football boarding school", "football schools for girls", "girls football sixth form",
  "women's football scholarships usa", "soccer scholarship usa girls", "us soccer scholarships uk girls",
  "girls football kit", "girls football boots", "best football boots for girls", "girls shin pads", "best shin pads for girls",
  "girls goalkeeper gloves", "girls football socks", "sports bra for football", "girls football gifts",
  "football gifts for girls", "football presents for girls",
  "periods and football", "football and periods", "playing football on your period", "sports bra football girls",
  "girls dropping out of sport", "why do girls stop playing football", "girls football confidence",
  "girls football benefits", "benefits of football for girls", "is football good for girls",
  "female footballers", "female football players", "famous female footballers", "best female footballers",
  "girls football parties", "football party for girls",
  "girls football statistics", "girls football participation", "girls football growth",
  "walking football women", "women's football near me", "women's football teams near me", "ladies football near me",
  "women's football clubs near me", "adult women's football beginners", "women's football for beginners",
  "mum's football", "mums football near me", "ladies football", "ladies football team", "ladies football club",
  "how much do female footballers earn", "how much do wsl players earn", "female footballer salary",
  "women's football jobs", "women's football coaching jobs", "girls football coach", "how to coach girls football",
  "coaching girls football", "girls football coaching drills", "girls futsal", "futsal for girls", "girls futsal near me",
  "girls football heading rules", "heading ban girls football", "acl injury girls football", "acl injuries women's football",
  "acl prevention exercises football", "girls football injuries", "female acl injury football",
  "girls school football", "girls football in schools", "equal access football schools", "esfa girls",
  "girls football day", "lionesses legacy", "lionesses effect", "girls football festival",
  "dreams girls football", "girls football uk", "girls football england", "girls football scotland", "girls football wales",
];

type LabsGirlRow = { keyword: string };
type AdsItem = { keyword?: string; search_volume?: number | null; cpc?: number | null; competition?: string | null; monthly_searches?: { year: number; month: number; search_volume: number | null }[] };
type KdItem = { keyword?: string; keyword_difficulty?: number | null };

function clean(k: string) {
  return k.toLowerCase().replace(/[^a-z0-9' \-]/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const discovery = JSON.parse(readFileSync("seo-data/exports/girls-football-keyword-discovery-2026-10-06.json", "utf8")) as LabsGirlRow[];
  const girlTerms = discovery.map((r) => r.keyword).filter((k) => /girl/i.test(k));
  const candidates = [...new Set([...HAND_LIST, ...girlTerms].map(clean))].filter((k) => k.split(" ").length <= 10 && k.length <= 80).slice(0, 1000);
  console.log(`${candidates.length} candidates`);

  let totalCost = 0;
  const vol = await googleAdsSearchVolume(candidates, { workflow: WORKFLOW, environment: "live", confirmLive: true });
  totalCost += vol.cost ?? 0;
  if (vol.error || !vol.data) throw new Error(`search_volume failed: ${vol.error}`);
  const adsItems = (vol.data.tasks?.[0]?.result ?? []) as AdsItem[];
  console.log(`search_volume: ${adsItems.length} rows`);

  const withVol = adsItems.filter((i) => (i.search_volume ?? 0) >= 20 && i.keyword).map((i) => i.keyword as string);
  const kdMap = new Map<string, number | null>();
  for (let i = 0; i < withVol.length; i += 1000) {
    const kd = await bulkKeywordDifficulty(withVol.slice(i, i + 1000), { workflow: WORKFLOW, environment: "live", confirmLive: true });
    totalCost += kd.cost ?? 0;
    const items = ((kd.data?.tasks?.[0]?.result?.[0] as { items?: KdItem[] } | undefined)?.items ?? []) as KdItem[];
    for (const it of items) if (it.keyword) kdMap.set(it.keyword.toLowerCase(), it.keyword_difficulty ?? null);
  }

  const rows = adsItems
    .filter((i) => i.keyword)
    .map((i) => {
      const months = [...(i.monthly_searches ?? [])].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)).slice(-12);
      const peak = months.reduce<{ m: number; v: number } | null>((best, m) => ((m.search_volume ?? 0) > (best?.v ?? -1) ? { m: m.month, v: m.search_volume ?? 0 } : best), null);
      return {
        keyword: i.keyword as string,
        volume: i.search_volume ?? null,
        kd: kdMap.get((i.keyword as string).toLowerCase()) ?? null,
        cpc: i.cpc ?? null,
        competition: i.competition ?? null,
        peakMonth: peak?.m ?? null,
        peakVolume: peak?.v ?? null,
      };
    })
    .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
  writeFileSync("seo-data/exports/girls-football-volume-kd-2026-10-06.json", JSON.stringify(rows, null, 2));
  console.log(`${rows.filter((r) => (r.volume ?? 0) > 0).length} with volume; written. Total cost $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
