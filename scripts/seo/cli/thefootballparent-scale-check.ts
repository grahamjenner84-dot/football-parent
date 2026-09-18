// thefootballparent.co.uk surfaced unprompted during the Junior Grassroots
// Hub research: ChatGPT cited it twice, as two separate sources, for
// "which UK websites explain football academy categories 1 to 4" - a query
// footballparent.co.uk ranks #1 for organically and was not cited on. The
// names are near-identical, so this sizes up a competitor we weren't
// previously tracking: scale, ranked keywords, and how much of its keyword
// set overlaps ours.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/thefootballparent-scale-check.ts
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { domainRankOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { backlinksSummary } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const TARGET = "thefootballparent.co.uk";
const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");

async function main() {
  migrate();
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const liveReady =
    process.env.DATAFORSEO_ENV === "live" &&
    process.env.DATAFORSEO_ALLOW_LIVE === "true" &&
    process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 1 domain_rank_overview + 1 ranked_keywords (limit 500) + 1 backlinks_summary for ${TARGET}. Rough estimated cost: ~$0.10.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set.");
    return;
  }

  const common = { workflow: "thefootballparent-scale-check", environment: "live" as const, confirmLive: true };
  let totalCost = 0;

  const overview = await domainRankOverview(TARGET, common);
  totalCost += overview.cost ?? 0;
  const arr = (overview.data?.tasks?.[0]?.result as Array<{ metrics?: { organic?: Record<string, number> }; items?: Array<{ metrics?: { organic?: Record<string, number> } }> }>) ?? [];
  const m = arr[0]?.metrics?.organic ?? arr[0]?.items?.[0]?.metrics?.organic;
  console.log(`\n=== ${TARGET} scale ===`);
  console.log(`  ranked keywords=${m?.count ?? "n/a"}, est. monthly organic traffic (etv)=${m?.etv?.toFixed?.(0) ?? "n/a"}`);
  console.log(`  positions: #1=${m?.pos_1 ?? 0}, 2-3=${m?.pos_2_3 ?? 0}, 4-10=${m?.pos_4_10 ?? 0}, 11-20=${m?.pos_11_20 ?? 0}`);

  const ranked = await rankedKeywords(TARGET, { ...common, limit: 500, cacheFamily: "competitor_rankings" });
  totalCost += ranked.cost ?? 0;
  const items =
    (ranked.data?.tasks?.[0]?.result as
      | Array<{
          items?: Array<{
            keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number } };
            ranked_serp_element?: { serp_item?: { etv?: number; rank_absolute?: number; url?: string } };
          }>;
        }>
      | undefined) ?? [];
  const rows = (items[0]?.items ?? []).map((r) => ({
    keyword: r.keyword_data?.keyword ?? "",
    volume: r.keyword_data?.keyword_info?.search_volume ?? 0,
    position: r.ranked_serp_element?.serp_item?.rank_absolute ?? null,
    etv: r.ranked_serp_element?.serp_item?.etv ?? 0,
    url: r.ranked_serp_element?.serp_item?.url ?? "",
  }));

  console.log(`\n=== Top 30 keywords by estimated traffic (${rows.length} retrieved) ===`);
  for (const r of [...rows].sort((a, b) => b.etv - a.etv).slice(0, 30)) {
    console.log(`  etv=${r.etv.toFixed(1).padStart(7)} vol=${String(r.volume).padStart(6)} pos=${String(r.position ?? "-").padStart(3)} | ${r.keyword}  ->  ${r.url.replace(`https://www.${TARGET}`, "")}`);
  }

  const bl = await backlinksSummary(TARGET, common);
  totalCost += bl.cost ?? 0;
  const b = (bl.data?.tasks?.[0]?.result as Array<Record<string, unknown>> | undefined)?.[0];
  console.log(`\n=== Link authority ===`);
  console.log(`  rank=${b?.rank ?? "n/a"}, backlinks=${b?.backlinks ?? "n/a"}, referring domains=${b?.referring_domains ?? "n/a"}, spam score=${b?.backlinks_spam_score ?? "n/a"}`);

  // Head-to-head against our own ranked-keyword export, if it's present.
  const ourCsv = path.join(EXPORT_DIR, "footballparent-ranked-keywords.csv");
  if (fs.existsSync(ourCsv)) {
    const ours = new Map<string, string>();
    const lines = fs.readFileSync(ourCsv, "utf8").split("\n").slice(1).filter(Boolean);
    for (const line of lines) {
      const kw = line.startsWith('"') ? line.slice(1, line.indexOf('"', 1)) : line.slice(0, line.indexOf(","));
      const parts = line.split(",");
      ours.set(kw, parts[parts.length - 7] ?? "?");
    }
    const shared = rows.filter((r) => ours.has(r.keyword));
    console.log(`\n=== Head-to-head: keywords we both rank for (${shared.length}) ===`);
    for (const r of shared.sort((a, b) => b.volume - a.volume).slice(0, 30)) {
      console.log(`  vol=${String(r.volume).padStart(6)} | their pos=${String(r.position ?? "-").padStart(3)} | ${r.keyword}`);
    }
  }

  fs.writeFileSync(path.join(EXPORT_DIR, "thefootballparent-ranked-keywords.json"), JSON.stringify({ overview: m, backlinks: b, rows }, null, 2));
  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
