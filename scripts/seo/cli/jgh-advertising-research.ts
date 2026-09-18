// Advertising due-diligence research: how big is juniorgrassrootshub.com
// really, in organic search terms, compared to footballparent.co.uk - plus
// the same full ranked-keyword breakdown for teamstats.net. Graham is
// considering paying to advertise on Junior Grassroots Hub and wants a
// like-for-like scale comparison rather than whatever traffic number the
// site's own media pack claims.
//
// Three things per domain:
//   1. domain_rank_overview  - aggregate scale (ranked keyword count, etv,
//      position distribution)
//   2. ranked_keywords       - the actual keyword list (limit 1000), which
//      we dump in full to JSON/CSV and summarise by volume and by etv
//   3. backlinks/summary     - referring domains + rank, i.e. how much
//      authority an advertising link from them would actually carry
//
// Full untruncated output goes to seo-data/exports/ so the keyword lists can
// be read without flooding the console.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/jgh-advertising-research.ts
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { domainRankOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { backlinksSummary } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");

const DOMAINS = [
  { label: "footballparent.co.uk (us)", target: "footballparent.co.uk", slug: "footballparent" },
  { label: "juniorgrassrootshub.com", target: "juniorgrassrootshub.com", slug: "juniorgrassrootshub" },
  { label: "teamstats.net", target: "teamstats.net", slug: "teamstats" },
];

type OrganicMetrics = {
  count?: number;
  etv?: number;
  pos_1?: number;
  pos_2_3?: number;
  pos_4_10?: number;
  pos_11_20?: number;
  pos_21_30?: number;
  pos_31_40?: number;
  pos_41_50?: number;
  pos_51_60?: number;
  pos_61_70?: number;
  pos_71_80?: number;
  pos_81_90?: number;
  pos_91_100?: number;
  impressions_etv?: number;
  estimated_paid_traffic_cost?: number;
  is_new?: number;
  is_up?: number;
  is_down?: number;
  is_lost?: number;
};

// The Labs overview response has been seen in two shapes across previous
// scripts in this directory (metrics at result level vs nested under an
// items array), so read whichever is present rather than assuming.
function readOverviewMetrics(result: unknown): OrganicMetrics | undefined {
  const arr = (result as Array<{ metrics?: { organic?: OrganicMetrics }; items?: Array<{ metrics?: { organic?: OrganicMetrics } }> }>) ?? [];
  return arr[0]?.metrics?.organic ?? arr[0]?.items?.[0]?.metrics?.organic;
}

type RankedRow = {
  keyword: string;
  volume: number;
  cpc: number | null;
  competition: number | null;
  position: number | null;
  etv: number;
  url: string;
  intent: string | null;
  serpFeatures: string[];
};

function readRankedRows(result: unknown): RankedRow[] {
  const arr =
    (result as
      | Array<{
          items?: Array<{
            keyword_data?: {
              keyword?: string;
              keyword_info?: {
                search_volume?: number;
                cpc?: number | null;
                competition?: number | null;
              };
              search_intent_info?: { main_intent?: string };
              serp_info?: { serp_item_types?: string[] };
            };
            ranked_serp_element?: {
              serp_item?: { etv?: number; rank_absolute?: number; url?: string };
            };
          }>;
        }>
      | undefined) ?? [];
  const rows = arr[0]?.items ?? [];
  return rows.map((r) => ({
    keyword: r.keyword_data?.keyword ?? "",
    volume: r.keyword_data?.keyword_info?.search_volume ?? 0,
    cpc: r.keyword_data?.keyword_info?.cpc ?? null,
    competition: r.keyword_data?.keyword_info?.competition ?? null,
    position: r.ranked_serp_element?.serp_item?.rank_absolute ?? null,
    etv: r.ranked_serp_element?.serp_item?.etv ?? 0,
    url: r.ranked_serp_element?.serp_item?.url ?? "",
    intent: r.keyword_data?.search_intent_info?.main_intent ?? null,
    serpFeatures: r.keyword_data?.serp_info?.serp_item_types ?? [],
  }));
}

function csvEscape(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  migrate();
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const liveReady =
    process.env.DATAFORSEO_ENV === "live" &&
    process.env.DATAFORSEO_ALLOW_LIVE === "true" &&
    process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: ${DOMAINS.length} domain_rank_overview + ${DOMAINS.length} ranked_keywords (limit 1000) + ${DOMAINS.length} backlinks_summary, for: ${DOMAINS.map((d) => d.target).join(", ")}. Rough estimated cost: ~$0.60 (cache-first, so reruns are free).`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "jgh-advertising-research", environment: "live" as const, confirmLive: true };
  const summary: Record<string, unknown> = {};

  for (const d of DOMAINS) {
    console.log(`\n\n##################### ${d.label} #####################`);
    const perDomain: Record<string, unknown> = {};

    // --- 1. scale ---------------------------------------------------------
    const overview = await domainRankOverview(d.target, common);
    totalCost += overview.cost ?? 0;
    if (overview.error || !overview.data) {
      console.log(`domain_rank_overview ERROR: ${overview.error}`);
    } else {
      const m = readOverviewMetrics(overview.data.tasks?.[0]?.result);
      perDomain.overview = m ?? null;
      console.log("--- Scale (organic) ---");
      console.log(`  ranked keywords total:        ${m?.count ?? "n/a"}`);
      console.log(`  est. monthly organic traffic: ${m?.etv?.toFixed?.(0) ?? "n/a"}`);
      console.log(`  est. monthly impressions:     ${m?.impressions_etv?.toFixed?.(0) ?? "n/a"}`);
      console.log(`  equivalent paid traffic cost: $${m?.estimated_paid_traffic_cost?.toFixed?.(0) ?? "n/a"}/mo`);
      console.log(
        `  positions: #1=${m?.pos_1 ?? 0}, 2-3=${m?.pos_2_3 ?? 0}, 4-10=${m?.pos_4_10 ?? 0}, 11-20=${m?.pos_11_20 ?? 0}, 21-30=${m?.pos_21_30 ?? 0}, 31-100=${
          (m?.pos_31_40 ?? 0) + (m?.pos_41_50 ?? 0) + (m?.pos_51_60 ?? 0) + (m?.pos_61_70 ?? 0) + (m?.pos_71_80 ?? 0) + (m?.pos_81_90 ?? 0) + (m?.pos_91_100 ?? 0)
        }`
      );
      console.log(`  momentum: new=${m?.is_new ?? 0}, up=${m?.is_up ?? 0}, down=${m?.is_down ?? 0}, lost=${m?.is_lost ?? 0}`);
    }

    // --- 2. ranked keywords ----------------------------------------------
    const ranked = await rankedKeywords(d.target, { ...common, limit: 1000, cacheFamily: "competitor_rankings" });
    totalCost += ranked.cost ?? 0;
    if (ranked.error || !ranked.data) {
      console.log(`ranked_keywords ERROR: ${ranked.error}`);
    } else {
      const rows = readRankedRows(ranked.data.tasks?.[0]?.result);
      perDomain.rankedKeywordCount = rows.length;
      perDomain.rankedKeywords = rows;

      const csvPath = path.join(EXPORT_DIR, `${d.slug}-ranked-keywords.csv`);
      fs.writeFileSync(
        csvPath,
        ["keyword,search_volume,position,etv,cpc,competition,intent,url,serp_features"]
          .concat(
            [...rows]
              .sort((a, b) => b.volume - a.volume)
              .map((r) =>
                [r.keyword, r.volume, r.position, r.etv.toFixed(2), r.cpc, r.competition, r.intent, r.url, r.serpFeatures.join(" ")]
                  .map(csvEscape)
                  .join(",")
              )
          )
          .join("\n") + "\n"
      );

      const totalVol = rows.reduce((s, r) => s + r.volume, 0);
      const totalEtv = rows.reduce((s, r) => s + r.etv, 0);
      console.log(`\n--- Ranked keywords: ${rows.length} retrieved (of ${(perDomain.overview as OrganicMetrics | null)?.count ?? "?"} total) ---`);
      console.log(`  sum of search volume across retrieved keywords: ${totalVol}`);
      console.log(`  sum of etv across retrieved keywords:           ${totalEtv.toFixed(0)}`);
      console.log(`  written in full to ${path.relative(REPO_ROOT, csvPath).replace(/\\/g, "/")}`);

      console.log(`\n  TOP 40 BY SEARCH VOLUME:`);
      for (const r of [...rows].sort((a, b) => b.volume - a.volume).slice(0, 40)) {
        console.log(`    vol=${String(r.volume).padStart(7)} pos=${String(r.position ?? "-").padStart(4)} etv=${r.etv.toFixed(1).padStart(8)} | ${r.keyword}`);
      }

      console.log(`\n  TOP 40 BY ESTIMATED TRAFFIC (etv):`);
      for (const r of [...rows].sort((a, b) => b.etv - a.etv).slice(0, 40)) {
        console.log(
          `    etv=${r.etv.toFixed(1).padStart(8)} vol=${String(r.volume).padStart(7)} pos=${String(r.position ?? "-").padStart(4)} | ${r.keyword}  ->  ${r.url}`
        );
      }

      // Which pages actually carry the traffic - matters for advertising:
      // an ad on a page nobody lands on is worth nothing.
      const byUrl = new Map<string, { etv: number; vol: number; kws: number }>();
      for (const r of rows) {
        const cur = byUrl.get(r.url) ?? { etv: 0, vol: 0, kws: 0 };
        cur.etv += r.etv;
        cur.vol += r.volume;
        cur.kws += 1;
        byUrl.set(r.url, cur);
      }
      console.log(`\n  TOP 20 LANDING PAGES BY ESTIMATED TRAFFIC:`);
      for (const [url, v] of [...byUrl.entries()].sort((a, b) => b[1].etv - a[1].etv).slice(0, 20)) {
        console.log(`    etv=${v.etv.toFixed(1).padStart(8)} kws=${String(v.kws).padStart(4)} | ${url}`);
      }
      perDomain.topPages = [...byUrl.entries()]
        .sort((a, b) => b[1].etv - a[1].etv)
        .slice(0, 30)
        .map(([url, v]) => ({ url, ...v }));
    }

    // --- 3. link authority ------------------------------------------------
    const bl = await backlinksSummary(d.target, { ...common });
    totalCost += bl.cost ?? 0;
    if (bl.error || !bl.data) {
      console.log(`\nbacklinks_summary ERROR: ${bl.error}`);
    } else {
      const r = (bl.data.tasks?.[0]?.result as Array<Record<string, unknown>> | undefined)?.[0];
      perDomain.backlinks = {
        rank: r?.rank,
        backlinks: r?.backlinks,
        referring_domains: r?.referring_domains,
        referring_main_domains: r?.referring_main_domains,
        broken_backlinks: r?.broken_backlinks,
        backlinks_spam_score: r?.backlinks_spam_score,
        referring_links_types: r?.referring_links_types,
      };
      console.log(`\n--- Link authority ---`);
      console.log(
        `  DataForSEO rank=${r?.rank ?? "n/a"}, backlinks=${r?.backlinks ?? "n/a"}, referring domains=${r?.referring_domains ?? "n/a"}, referring main domains=${r?.referring_main_domains ?? "n/a"}, spam score=${r?.backlinks_spam_score ?? "n/a"}`
      );
    }

    summary[d.target] = perDomain;
  }

  const jsonPath = path.join(EXPORT_DIR, "jgh-advertising-research.json");
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  console.log(`\n\nFull structured output: ${path.relative(REPO_ROOT, jsonPath).replace(/\\/g, "/")}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
