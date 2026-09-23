// Redirect-map builder for the grassrootsfootball.co.uk purchase decision.
//
// Follow-up to grassrootsfootball-couk-domain-check.ts (2026-09-17) and the
// two filtered attempts after it. What those established, and why this
// script exists:
//
//   - The unfiltered top-200 backlinks pull was almost entirely
//     teamstats.net self-links, so the third-party links that make the
//     domain worth buying (fourfourtwo.com, mirror.co.uk,
//     birminghammail.co.uk, saintsweb.co.uk, sportsister.com,
//     thinkfitness.net at referring-domain level) never surfaced as rows.
//   - The filtered attempts returned 0 rows. Most likely cause: they asked
//     for backlinks_status_type "live", and links to a domain that has
//     been 301-ing to teamstats.net for a long time are often flagged lost
//     by the index even though the linking page still exists. This pull
//     uses "all".
//   - Nothing from those runs was written to a committed export: the raw
//     responses sit in seo-data/raw and the SQLite cache, both gitignored.
//     This script writes CSV + markdown into seo-data/exports so the answer
//     survives across machines and sessions.
//
// The point of the output is the exact url_to on grassrootsfootball.co.uk
// for every third-party link. A new owner only captures a link's value if
// the URL it points at redirects to a genuinely matching page, one hop, on
// footballparent.co.uk. A root-only redirect misses every deep link, and
// redirecting every deep link to one page reads as a soft 404 (and is the
// "expired domain repurposing" pattern Google's spam policy names).
//
// Outputs (dated, committed):
//   seo-data/exports/grassrootsfootball-couk-backlinks-<date>.csv
//       every third-party backlink row, one per link
//   seo-data/exports/grassrootsfootball-couk-redirect-map-<date>.csv
//       one row per destination URL on the old domain, aggregated, with
//       empty redirect_to / notes columns to fill in by hand
//   seo-data/exports/grassrootsfootball-couk-link-audit-<date>.md
//       human-readable summary: referring domains by rank, destination
//       URLs by link value, the draft redirect map
//
// Usage (after explicit user approval in-session; live DataForSEO spend):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/grassrootsfootball-couk-redirect-map.ts
//
// Estimated cost: 1 summary + 1 referring_domains (limit 500) + up to 3
// backlinks pages (limit 1000 each, stops early when a page comes back
// short). Roughly $0.10 to $0.20 total at current backlinks API pricing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "../database/migrate";
import { backlinksSummary, referringDomains, backlinksList } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const TARGET = "grassrootsfootball.co.uk";
// Links from the current owner's own properties are not "inbound value":
// they disappear the moment the domain changes hands.
const SELF_DOMAIN_PATTERNS = ["teamstats", "grassrootsfootball.co.uk"];
const PAGE_SIZE = 1000;
const MAX_PAGES = 3;
const REF_DOMAIN_LIMIT = 500;

const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");
const DATE = new Date().toISOString().slice(0, 10);

type RefDomainRow = {
  domain?: string;
  rank?: number;
  backlinks?: number;
  referring_pages?: number;
  first_seen?: string;
  lost_date?: string | null;
  backlinks_spam_score?: number;
};

type BacklinkRow = {
  url_from?: string;
  url_to?: string;
  domain_from?: string;
  domain_from_rank?: number;
  page_from_rank?: number;
  page_from_title?: string;
  anchor?: string;
  dofollow?: boolean;
  is_lost?: boolean;
  first_seen?: string;
  last_seen?: string;
  item_type?: string;
  backlink_spam_score?: number;
  is_indirect_link?: boolean;
  indirect_link_path?: unknown;
};

type Target = {
  url: string;
  backlinks: number;
  referringDomains: Set<string>;
  dofollow: number;
  live: number;
  bestDomainRank: number;
  bestReferrer: string;
  anchors: Map<string, number>;
  firstSeen: string;
  lastSeen: string;
};

function isSelfLink(domainFrom: string | undefined): boolean {
  const d = (domainFrom ?? "").toLowerCase();
  return SELF_DOMAIN_PATTERNS.some((p) => d.includes(p));
}

// Collapse http/https, www and trailing-slash variants of the same old URL
// so the redirect map has one row per real destination.
function normaliseUrlTo(raw: string | undefined): string {
  if (!raw) return "(unknown)";
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    let p = u.pathname.replace(/\/+$/, "");
    if (p === "") p = "/";
    return `${host}${p}${u.search}`;
  } catch {
    return raw.toLowerCase();
  }
}

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(file: string, header: string[], rows: unknown[][]): void {
  const lines = [header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
}

function topAnchors(m: Map<string, number>, n: number): string {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([a, c]) => `${a || "(empty)"} x${c}`)
    .join(" | ");
}

function resultItems<T>(res: { data: { tasks?: Array<{ result?: unknown }> } | null }): T[] {
  const result = res.data?.tasks?.[0]?.result as Array<{ items?: T[] }> | undefined;
  return result?.[0]?.items ?? [];
}

async function main() {
  migrate();

  const liveReady =
    process.env.DATAFORSEO_ENV === "live" &&
    process.env.DATAFORSEO_ALLOW_LIVE === "true" &&
    process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan for ${TARGET}: 1 backlinks/summary, 1 backlinks/referring_domains (limit ${REF_DOMAIN_LIMIT}, status all), ` +
      `up to ${MAX_PAGES} x backlinks/backlinks (limit ${PAGE_SIZE}, status all, self-links excluded). Rough estimated cost: $0.10-$0.20.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "grassrootsfootball-couk-redirect-map", environment: "live" as const, confirmLive: true };

  // 1. Profile summary (the summary endpoint is live-status only).
  console.log(`\n=== ${TARGET}: backlink profile summary ===`);
  const summary = await backlinksSummary(TARGET, common);
  totalCost += summary.cost ?? 0;
  const summaryResult = (summary.data?.tasks?.[0]?.result as Array<Record<string, unknown>> | undefined)?.[0];
  if (summary.error || !summaryResult) {
    console.log(`ERROR: ${summary.error ?? "no result"}`);
  } else {
    const keys = ["rank", "backlinks", "referring_domains", "referring_main_domains", "referring_pages", "backlinks_spam_score", "first_seen", "lost_date"];
    for (const k of keys) console.log(`  ${k}: ${JSON.stringify(summaryResult[k])}`);
  }

  // 2. Referring domains, all statuses, so lost-but-still-linking domains show.
  console.log(`\n=== ${TARGET}: referring domains (status all, top ${REF_DOMAIN_LIMIT}) ===`);
  const ref = await referringDomains(TARGET, { ...common, limit: REF_DOMAIN_LIMIT, backlinksStatusType: "all" });
  totalCost += ref.cost ?? 0;
  const refRows: RefDomainRow[] = ref.error ? [] : resultItems<RefDomainRow>(ref);
  if (ref.error) console.log(`ERROR: ${ref.error}`);
  const refThirdParty = refRows.filter((r) => !isSelfLink(r.domain)).sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
  console.log(`${refRows.length} referring domains returned, ${refThirdParty.length} third-party after excluding self-links.`);
  for (const r of refThirdParty.slice(0, 40)) {
    console.log(
      `  ${r.domain} | rank=${r.rank ?? "n/a"} | backlinks=${r.backlinks ?? "n/a"} | spam=${r.backlinks_spam_score ?? "n/a"} | first_seen=${r.first_seen ?? ""} | lost=${r.lost_date ?? ""}`
    );
  }

  // 3. Every backlink row, all statuses, self-links filtered server-side so
  //    teamstats.net's own thousands of links don't eat the page budget.
  //    If the filter shape is rejected, fall back to unfiltered pages and
  //    drop self-links client-side (noisier, but still gives the answer).
  console.log(`\n=== ${TARGET}: backlink rows (status all) ===`);
  const filters: unknown[] = [["domain_from", "not_like", "%teamstats%"], "and", ["domain_from", "not_like", "%grassrootsfootball.co.uk%"]];
  let useFilters = true;
  const all: BacklinkRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    let res = await backlinksList(TARGET, {
      ...common,
      limit: PAGE_SIZE,
      offset,
      backlinksStatusType: "all",
      filters: useFilters ? filters : undefined,
    });
    totalCost += res.cost ?? 0;
    if (res.error && useFilters && page === 0) {
      console.log(`Filtered call rejected (${res.error}); retrying unfiltered and excluding self-links client-side.`);
      useFilters = false;
      res = await backlinksList(TARGET, { ...common, limit: PAGE_SIZE, offset, backlinksStatusType: "all" });
      totalCost += res.cost ?? 0;
    }
    if (res.error) {
      console.log(`ERROR on page ${page + 1}: ${res.error}`);
      break;
    }
    const rows = resultItems<BacklinkRow>(res);
    console.log(`  page ${page + 1}: ${rows.length} rows (cache ${res.cacheStatus})`);
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  const thirdParty = all.filter((r) => !isSelfLink(r.domain_from));
  console.log(`${all.length} rows pulled, ${thirdParty.length} third-party.`);

  const written = buildAndWriteExports({ thirdParty, refThirdParty, summaryResult });
  console.log(`\nWrote:\n  ${written.map((f) => path.relative(REPO_ROOT, f)).join("\n  ")}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(3)}`);
}

// Pure aggregation + file output, separated from the API calls so it can be
// exercised against fixture rows without spending on DataForSEO.
export function buildAndWriteExports(input: {
  thirdParty: BacklinkRow[];
  refThirdParty: RefDomainRow[];
  summaryResult: Record<string, unknown> | undefined;
  exportDir?: string;
  date?: string;
}): string[] {
  const { thirdParty, refThirdParty, summaryResult } = input;
  const exportDir = input.exportDir ?? EXPORT_DIR;
  const date = input.date ?? DATE;

  // 4. Aggregate by destination URL on the old domain.
  const targets = new Map<string, Target>();
  for (const r of thirdParty) {
    const key = normaliseUrlTo(r.url_to);
    let t = targets.get(key);
    if (!t) {
      t = {
        url: key,
        backlinks: 0,
        referringDomains: new Set(),
        dofollow: 0,
        live: 0,
        bestDomainRank: 0,
        bestReferrer: "",
        anchors: new Map(),
        firstSeen: r.first_seen ?? "",
        lastSeen: r.last_seen ?? "",
      };
      targets.set(key, t);
    }
    t.backlinks += 1;
    if (r.domain_from) t.referringDomains.add(r.domain_from);
    if (r.dofollow) t.dofollow += 1;
    if (!r.is_lost) t.live += 1;
    const rank = r.domain_from_rank ?? 0;
    if (rank > t.bestDomainRank) {
      t.bestDomainRank = rank;
      t.bestReferrer = r.domain_from ?? "";
    }
    const anchor = (r.anchor ?? "").trim();
    t.anchors.set(anchor, (t.anchors.get(anchor) ?? 0) + 1);
    if (r.first_seen && (!t.firstSeen || r.first_seen < t.firstSeen)) t.firstSeen = r.first_seen;
    if (r.last_seen && (!t.lastSeen || r.last_seen > t.lastSeen)) t.lastSeen = r.last_seen;
  }
  // Order by the thing that matters for the redirect map: how strong the
  // best referrer is, then how many domains point there.
  const targetList = [...targets.values()].sort(
    (a, b) => b.bestDomainRank - a.bestDomainRank || b.referringDomains.size - a.referringDomains.size
  );

  console.log(`\n=== ${targetList.length} distinct destination URLs on ${TARGET} ===`);
  for (const t of targetList.slice(0, 60)) {
    console.log(
      `  ${t.url} | links=${t.backlinks} | domains=${t.referringDomains.size} | dofollow=${t.dofollow} | live=${t.live} | best=${t.bestReferrer} (rank ${t.bestDomainRank}) | anchors: ${topAnchors(t.anchors, 3)}`
    );
  }

  // 5. Write the committed exports.
  fs.mkdirSync(exportDir, { recursive: true });
  const backlinksCsv = path.join(exportDir, `grassrootsfootball-couk-backlinks-${date}.csv`);
  writeCsv(
    backlinksCsv,
    ["domain_from", "domain_from_rank", "url_from", "page_from_title", "url_to", "anchor", "dofollow", "is_lost", "first_seen", "last_seen", "item_type", "backlink_spam_score", "is_indirect_link"],
    thirdParty
      .sort((a, b) => (b.domain_from_rank ?? 0) - (a.domain_from_rank ?? 0))
      .map((r) => [
        r.domain_from,
        r.domain_from_rank,
        r.url_from,
        r.page_from_title,
        r.url_to,
        r.anchor,
        r.dofollow,
        r.is_lost,
        r.first_seen,
        r.last_seen,
        r.item_type,
        r.backlink_spam_score,
        r.is_indirect_link,
      ])
  );

  const mapCsv = path.join(exportDir, `grassrootsfootball-couk-redirect-map-${date}.csv`);
  writeCsv(
    mapCsv,
    ["old_url", "backlinks", "referring_domains", "dofollow", "still_live", "best_referrer", "best_referrer_rank", "top_anchors", "first_seen", "last_seen", "redirect_to", "notes"],
    targetList.map((t) => [
      t.url,
      t.backlinks,
      t.referringDomains.size,
      t.dofollow,
      t.live,
      t.bestReferrer,
      t.bestDomainRank,
      topAnchors(t.anchors, 3),
      t.firstSeen,
      t.lastSeen,
      "",
      "",
    ])
  );

  const md: string[] = [];
  md.push(`# grassrootsfootball.co.uk link audit - ${date}`);
  md.push("");
  md.push(`Source: DataForSEO backlinks API, status "all", self-links (${SELF_DOMAIN_PATTERNS.join(", ")}) excluded. Rank figures are DataForSEO's 0-1000 domain rank, a screening signal only.`);
  md.push("");
  if (summaryResult) {
    md.push("## Profile summary");
    md.push("");
    md.push("| Metric | Value |");
    md.push("|---|---|");
    for (const k of ["rank", "backlinks", "referring_domains", "referring_main_domains", "referring_pages", "backlinks_spam_score", "first_seen", "lost_date"]) {
      md.push(`| ${k} | ${JSON.stringify(summaryResult[k]) ?? ""} |`);
    }
    md.push("");
  }
  md.push(`## Third-party referring domains (${refThirdParty.length})`);
  md.push("");
  md.push("| Domain | Rank | Backlinks | Spam | First seen | Lost |");
  md.push("|---|---|---|---|---|---|");
  for (const r of refThirdParty) {
    md.push(`| ${r.domain} | ${r.rank ?? ""} | ${r.backlinks ?? ""} | ${r.backlinks_spam_score ?? ""} | ${(r.first_seen ?? "").slice(0, 10)} | ${(r.lost_date ?? "").slice(0, 10)} |`);
  }
  md.push("");
  md.push(`## Destination URLs on the old domain (${targetList.length})`);
  md.push("");
  md.push("Ordered by strongest referrer. `redirect_to` is blank on purpose: fill it in the CSV, one matching Football Parent page per row, or 410 where nothing matches.");
  md.push("");
  md.push("| Old URL | Links | Domains | Dofollow | Live | Best referrer | Anchors |");
  md.push("|---|---|---|---|---|---|---|");
  for (const t of targetList) {
    md.push(
      `| ${t.url} | ${t.backlinks} | ${t.referringDomains.size} | ${t.dofollow} | ${t.live} | ${t.bestReferrer} (${t.bestDomainRank}) | ${topAnchors(t.anchors, 3).replace(/\|/g, "/")} |`
    );
  }
  md.push("");
  md.push(`Exports: \`${path.relative(REPO_ROOT, backlinksCsv)}\`, \`${path.relative(REPO_ROOT, mapCsv)}\`.`);
  md.push("");
  const mdFile = path.join(exportDir, `grassrootsfootball-couk-link-audit-${date}.md`);
  fs.writeFileSync(mdFile, md.join("\n"), "utf8");
  return [backlinksCsv, mapCsv, mdFile];
}

// Only run the live pull when executed directly, so the export builder can
// be imported by a fixture test without triggering API calls.
const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
