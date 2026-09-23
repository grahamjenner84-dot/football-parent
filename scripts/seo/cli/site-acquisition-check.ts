// Due diligence for buying a dormant site (2026-09-23). Graham has spotted
// a few grassroots-football sites that still rank but haven't been updated
// since around 2019, and wants to know what they'd be worth before making
// a low offer. Takes any number of domains on the command line.
//
// Per domain, four calls:
//   backlinks/summary          - rank, referring domains, spam score
//   backlinks/referring_domains - who actually links to it (top 50, all statuses)
//   labs domain_rank_overview  - how many keywords it ranks for, est. traffic
//   labs ranked_keywords       - the actual keywords + which of ITS pages rank
//
// The ranked-keyword rows are the important part for the buy decision:
// they show which specific pages carry the rankings, so you know what
// content you'd be acquiring and what each page would redirect to (or be
// rewritten into) on footballparent.co.uk. A row is also flagged when we
// already rank for the same keyword, from the committed
// footballparent-ranked-keywords.csv export, since buying a page that
// competes with one of our own is a merge, not new reach.
//
// Outputs (dated, committed): seo-data/exports/site-acquisition-<domain>-<date>.md
// and a JSON with the raw rows alongside it.
//
// Usage (after explicit user approval in-session; live DataForSEO spend):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/site-acquisition-check.ts example.co.uk another.com
//
// Estimated cost: roughly $0.10 per domain.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "../database/migrate";
import { backlinksSummary, referringDomains } from "../dataforseo/endpoints/backlinks";
import { domainRankOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");
const DATE = new Date().toISOString().slice(0, 10);
const RANKED_LIMIT = 300;
const REF_LIMIT = 50;

type RefDomainRow = { domain?: string; rank?: number; backlinks?: number; backlinks_spam_score?: number; first_seen?: string; lost_date?: string | null };
type RankedRow = { keyword: string; volume: number; position: number | null; etv: number; url: string; weAlsoRank: boolean };

function csvField(line: string): string {
  return line.startsWith('"') ? line.slice(1, line.indexOf('"', 1)) : line.slice(0, line.indexOf(","));
}

function loadOurKeywords(): Set<string> {
  const file = path.join(EXPORT_DIR, "footballparent-ranked-keywords.csv");
  if (!fs.existsSync(file)) return new Set();
  return new Set(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .slice(1)
      .filter(Boolean)
      .map((l) => csvField(l).toLowerCase())
  );
}

function resultItems<T>(res: { data: { tasks?: Array<{ result?: unknown }> } | null }): T[] {
  const result = res.data?.tasks?.[0]?.result as Array<{ items?: T[] }> | undefined;
  return result?.[0]?.items ?? [];
}

function safeName(domain: string): string {
  return domain.toLowerCase().replace(/[^a-z0-9.-]/g, "").replace(/\./g, "-");
}

async function checkDomain(target: string, ours: Set<string>, common: { workflow: string; environment: "live"; confirmLive: true }): Promise<number> {
  let cost = 0;
  console.log(`\n==================== ${target}`);

  const bl = await backlinksSummary(target, common);
  cost += bl.cost ?? 0;
  const summary = (bl.data?.tasks?.[0]?.result as Array<Record<string, unknown>> | undefined)?.[0];
  console.log(`links: rank=${summary?.rank ?? "n/a"} backlinks=${summary?.backlinks ?? "n/a"} referring domains=${summary?.referring_domains ?? "n/a"} spam=${summary?.backlinks_spam_score ?? "n/a"} first_seen=${summary?.first_seen ?? ""}`);

  const ref = await referringDomains(target, { ...common, limit: REF_LIMIT, backlinksStatusType: "all" });
  cost += ref.cost ?? 0;
  const refRows = (ref.error ? [] : resultItems<RefDomainRow>(ref)).sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
  if (ref.error) console.log(`referring_domains ERROR: ${ref.error}`);
  console.log(`top referring domains (${refRows.length}):`);
  for (const r of refRows.slice(0, 15)) {
    console.log(`  ${r.domain} | rank=${r.rank ?? "n/a"} | backlinks=${r.backlinks ?? "n/a"} | spam=${r.backlinks_spam_score ?? "n/a"} | lost=${r.lost_date ?? ""}`);
  }

  const overview = await domainRankOverview(target, common);
  cost += overview.cost ?? 0;
  const arr = (overview.data?.tasks?.[0]?.result as Array<{ metrics?: { organic?: Record<string, number> }; items?: Array<{ metrics?: { organic?: Record<string, number> } }> }>) ?? [];
  const m = arr[0]?.metrics?.organic ?? arr[0]?.items?.[0]?.metrics?.organic;
  console.log(`organic: keywords=${m?.count ?? "n/a"} est. monthly traffic=${m?.etv?.toFixed?.(0) ?? "n/a"} | #1=${m?.pos_1 ?? 0} 2-3=${m?.pos_2_3 ?? 0} 4-10=${m?.pos_4_10 ?? 0} 11-20=${m?.pos_11_20 ?? 0}`);

  const ranked = await rankedKeywords(target, { ...common, limit: RANKED_LIMIT, cacheFamily: "competitor_rankings" });
  cost += ranked.cost ?? 0;
  const items =
    (ranked.data?.tasks?.[0]?.result as
      | Array<{
          items?: Array<{
            keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number } };
            ranked_serp_element?: { serp_item?: { etv?: number; rank_absolute?: number; url?: string } };
          }>;
        }>
      | undefined) ?? [];
  const rows: RankedRow[] = (items[0]?.items ?? []).map((r) => {
    const keyword = r.keyword_data?.keyword ?? "";
    return {
      keyword,
      volume: r.keyword_data?.keyword_info?.search_volume ?? 0,
      position: r.ranked_serp_element?.serp_item?.rank_absolute ?? null,
      etv: r.ranked_serp_element?.serp_item?.etv ?? 0,
      url: r.ranked_serp_element?.serp_item?.url ?? "",
      weAlsoRank: ours.has(keyword.toLowerCase()),
    };
  });

  // Which of THEIR pages carry the value: this is what you're really buying.
  const byPage = new Map<string, { etv: number; keywords: number; best: RankedRow | null }>();
  for (const r of rows) {
    const p = byPage.get(r.url) ?? { etv: 0, keywords: 0, best: null };
    p.etv += r.etv;
    p.keywords += 1;
    if (!p.best || r.etv > p.best.etv) p.best = r;
    byPage.set(r.url, p);
  }
  const pages = [...byPage.entries()].sort((a, b) => b[1].etv - a[1].etv);
  console.log(`ranking pages (${pages.length}) by estimated traffic:`);
  for (const [url, p] of pages.slice(0, 15)) {
    console.log(`  etv=${p.etv.toFixed(1).padStart(7)} kws=${String(p.keywords).padStart(3)} | ${url} | best: "${p.best?.keyword}" pos ${p.best?.position ?? "-"} vol ${p.best?.volume ?? 0}`);
  }
  const overlap = rows.filter((r) => r.weAlsoRank);
  console.log(`keywords we also rank for: ${overlap.length} of ${rows.length}`);

  // Markdown + JSON export.
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const base = `site-acquisition-${safeName(target)}-${DATE}`;
  const md: string[] = [];
  md.push(`# Site acquisition check: ${target} - ${DATE}`);
  md.push("");
  md.push("## Links");
  md.push("");
  md.push(`Rank ${summary?.rank ?? "n/a"}, ${summary?.backlinks ?? "n/a"} backlinks from ${summary?.referring_domains ?? "n/a"} referring domains, spam score ${summary?.backlinks_spam_score ?? "n/a"}, first seen ${typeof summary?.first_seen === "string" ? summary.first_seen.slice(0, 10) : "n/a"}.`);
  md.push("");
  md.push("| Referring domain | Rank | Backlinks | Spam | Lost |");
  md.push("|---|---|---|---|---|");
  for (const r of refRows) md.push(`| ${r.domain} | ${r.rank ?? ""} | ${r.backlinks ?? ""} | ${r.backlinks_spam_score ?? ""} | ${(r.lost_date ?? "") || ""} |`);
  md.push("");
  md.push("## Organic");
  md.push("");
  md.push(`${m?.count ?? "n/a"} ranked keywords, estimated ${m?.etv?.toFixed?.(0) ?? "n/a"} visits/month. Positions: #1 ${m?.pos_1 ?? 0}, 2-3 ${m?.pos_2_3 ?? 0}, 4-10 ${m?.pos_4_10 ?? 0}, 11-20 ${m?.pos_11_20 ?? 0}.`);
  md.push("");
  md.push("### Pages carrying the rankings");
  md.push("");
  md.push("| Page | Est. traffic | Keywords | Best keyword | Pos | Vol | Migrate to (fill in) |");
  md.push("|---|---|---|---|---|---|---|");
  for (const [url, p] of pages) md.push(`| ${url} | ${p.etv.toFixed(1)} | ${p.keywords} | ${p.best?.keyword ?? ""} | ${p.best?.position ?? ""} | ${p.best?.volume ?? ""} |  |`);
  md.push("");
  md.push(`### Keywords (${rows.length}, ${overlap.length} where we already rank)`);
  md.push("");
  md.push("| Keyword | Vol | Their pos | Est. traffic | We rank too | Their page |");
  md.push("|---|---|---|---|---|---|");
  for (const r of [...rows].sort((a, b) => b.etv - a.etv)) md.push(`| ${r.keyword} | ${r.volume} | ${r.position ?? ""} | ${r.etv.toFixed(1)} | ${r.weAlsoRank ? "yes" : ""} | ${r.url} |`);
  md.push("");
  fs.writeFileSync(path.join(EXPORT_DIR, `${base}.md`), md.join("\n"), "utf8");
  fs.writeFileSync(path.join(EXPORT_DIR, `${base}.json`), JSON.stringify({ target, date: DATE, summary, referringDomains: refRows, organic: m, rows }, null, 2));
  console.log(`wrote seo-data/exports/${base}.md and .json`);
  return cost;
}

async function main() {
  migrate();
  const targets = process.argv
    .slice(2)
    .map((t) => t.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
    .filter(Boolean);
  if (targets.length === 0) {
    console.log("Usage: LIVE_CONFIRM=yes npx tsx scripts/seo/cli/site-acquisition-check.ts <domain> [more domains]");
    return;
  }

  const liveReady =
    process.env.DATAFORSEO_ENV === "live" &&
    process.env.DATAFORSEO_ALLOW_LIVE === "true" &&
    process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: for each of ${targets.join(", ")}: 1 backlinks/summary, 1 referring_domains (limit ${REF_LIMIT}), 1 domain_rank_overview, 1 ranked_keywords (limit ${RANKED_LIMIT}). Rough estimated cost: ~$0.10 per domain.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const ours = loadOurKeywords();
  const common = { workflow: "site-acquisition-check", environment: "live" as const, confirmLive: true as const };
  let total = 0;
  for (const t of targets) total += await checkDomain(t, ours, common);
  console.log(`\nTotal actual API-reported cost: $${total.toFixed(3)}`);
}

const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
