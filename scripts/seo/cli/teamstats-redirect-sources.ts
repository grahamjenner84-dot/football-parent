// Finds other domains that currently redirect into teamstats.net, as
// candidates worth watching or buying (2026-09-23). Prompted by
// grassrootsfootball.co.uk turning up for sale on GoDaddy: TeamStats
// evidently owns a stable of grassroots-football domains it has folded
// into teamstats.net, and if one is being let go, others may follow.
//
// How it works. DataForSEO's backlinks index records "indirect" links:
// a page links to some-domain.co.uk, which 301s to teamstats.net, and the
// row carries the redirect chain in indirect_link_path. So a filtered
// pull of teamstats.net's backlinks where is_indirect_link = true, with
// the intermediate hop domains extracted, is a list of every domain the
// index has seen redirecting into TeamStats, weighted by how many
// third-party pages still link to it (the thing that gives it value).
//
// Each candidate then gets one backlinks/summary call so the output
// shows its own historical profile (rank, referring domains, first seen).
//
// Outputs (dated, committed):
//   seo-data/exports/teamstats-redirect-sources-<date>.csv
//   seo-data/exports/teamstats-redirect-sources-<date>.md
//
// Usage (after explicit user approval in-session; live DataForSEO spend):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/teamstats-redirect-sources.ts
//
// Estimated cost: up to 5 x backlinks/backlinks (limit 1000) plus one
// summary per candidate (capped at 30). Roughly $0.15 to $0.80 depending
// on how many redirect sources exist.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "../database/migrate";
import { backlinksSummary, backlinksList } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const TARGET = "teamstats.net";
const PAGE_SIZE = 1000;
const MAX_PAGES = 5;
const MAX_CANDIDATE_SUMMARIES = 30;
const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");
const DATE = new Date().toISOString().slice(0, 10);

type HopEntry = { type?: string; url?: string; status_code?: number };
type BacklinkRow = {
  url_from?: string;
  url_to?: string;
  domain_from?: string;
  domain_from_rank?: number;
  anchor?: string;
  dofollow?: boolean;
  is_lost?: boolean;
  is_indirect_link?: boolean;
  indirect_link_path?: HopEntry[] | null;
  first_seen?: string;
  last_seen?: string;
};

export type Candidate = {
  domain: string;
  links: number;
  referringDomains: Set<string>;
  dofollow: number;
  live: number;
  bestReferrer: string;
  bestReferrerRank: number;
  oldUrls: Map<string, number>;
  anchors: Map<string, number>;
  summary?: Record<string, unknown>;
};

function hostOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
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

function topN(m: Map<string, number>, n: number): string {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, c]) => `${k || "(empty)"} x${c}`)
    .join(" / ");
}

function resultItems<T>(res: { data: { tasks?: Array<{ result?: unknown }> } | null }): T[] {
  const result = res.data?.tasks?.[0]?.result as Array<{ items?: T[] }> | undefined;
  return result?.[0]?.items ?? [];
}

// Pure: rows in, candidates out. Every hop host in the redirect chain that
// is neither the linking page's own host nor the final target counts as a
// redirect source. Exported so it can be checked on fixture rows.
export function extractCandidates(rows: BacklinkRow[], target: string = TARGET): Map<string, Candidate> {
  const out = new Map<string, Candidate>();
  for (const r of rows) {
    const chain = Array.isArray(r.indirect_link_path) ? r.indirect_link_path : [];
    // Some index rows record only url_to on the intermediate domain with an
    // empty path; treat a non-target url_to as a hop too.
    const hopUrls = [...chain.map((h) => h.url), r.url_to];
    const fromHost = hostOf(r.url_from);
    const seenThisRow = new Set<string>();
    for (const u of hopUrls) {
      const host = hostOf(u);
      if (!host || host === target || host.endsWith(`.${target}`) || host === fromHost) continue;
      if (seenThisRow.has(host)) continue;
      seenThisRow.add(host);
      let c = out.get(host);
      if (!c) {
        c = {
          domain: host,
          links: 0,
          referringDomains: new Set(),
          dofollow: 0,
          live: 0,
          bestReferrer: "",
          bestReferrerRank: 0,
          oldUrls: new Map(),
          anchors: new Map(),
        };
        out.set(host, c);
      }
      c.links += 1;
      if (r.domain_from) c.referringDomains.add(r.domain_from);
      if (r.dofollow) c.dofollow += 1;
      if (!r.is_lost) c.live += 1;
      const rank = r.domain_from_rank ?? 0;
      if (rank > c.bestReferrerRank) {
        c.bestReferrerRank = rank;
        c.bestReferrer = r.domain_from ?? "";
      }
      const oldUrl = u ?? "";
      c.oldUrls.set(oldUrl, (c.oldUrls.get(oldUrl) ?? 0) + 1);
      const anchor = (r.anchor ?? "").trim();
      c.anchors.set(anchor, (c.anchors.get(anchor) ?? 0) + 1);
    }
  }
  return out;
}

export function writeExports(candidates: Candidate[], exportDir: string = EXPORT_DIR, date: string = DATE): string[] {
  fs.mkdirSync(exportDir, { recursive: true });
  const csv = path.join(exportDir, `teamstats-redirect-sources-${date}.csv`);
  writeCsv(
    csv,
    [
      "domain",
      "third_party_links",
      "referring_domains",
      "dofollow",
      "still_live",
      "best_referrer",
      "best_referrer_rank",
      "own_rank",
      "own_referring_domains",
      "own_backlinks",
      "own_first_seen",
      "top_old_urls",
      "top_anchors",
      "verdict",
      "notes",
    ],
    candidates.map((c) => [
      c.domain,
      c.links,
      c.referringDomains.size,
      c.dofollow,
      c.live,
      c.bestReferrer,
      c.bestReferrerRank,
      c.summary?.rank,
      c.summary?.referring_domains,
      c.summary?.backlinks,
      typeof c.summary?.first_seen === "string" ? c.summary.first_seen.slice(0, 10) : "",
      topN(c.oldUrls, 3),
      topN(c.anchors, 3),
      "",
      "",
    ])
  );

  const md: string[] = [];
  md.push(`# Domains redirecting into ${TARGET} - ${date}`);
  md.push("");
  md.push("Source: DataForSEO backlinks index, indirect links to teamstats.net with the redirect chain unpacked. \"Third-party links\" counts linking pages that reach TeamStats via that domain. \"Own\" columns are the candidate's own backlinks/summary. Rank is DataForSEO's 0-1000 domain rank, a screening signal only.");
  md.push("");
  md.push("| Domain | 3rd-party links | Ref. domains | Dofollow | Live | Best referrer | Own rank | Own ref. domains | First seen | Top old URLs |");
  md.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const c of candidates) {
    md.push(
      `| ${c.domain} | ${c.links} | ${c.referringDomains.size} | ${c.dofollow} | ${c.live} | ${c.bestReferrer} (${c.bestReferrerRank}) | ${c.summary?.rank ?? ""} | ${c.summary?.referring_domains ?? ""} | ${typeof c.summary?.first_seen === "string" ? c.summary.first_seen.slice(0, 10) : ""} | ${topN(c.oldUrls, 2).replace(/\|/g, "/")} |`
    );
  }
  md.push("");
  md.push("Next step for any row worth pursuing: check whether the domain is actually for sale (GoDaddy/Sedo/Dan listing, or Nominet WHOIS for the registrar and expiry), then run `grassrootsfootball-couk-redirect-map.ts` with TARGET changed to that domain for the page-level map.");
  md.push("");
  const mdFile = path.join(exportDir, `teamstats-redirect-sources-${date}.md`);
  fs.writeFileSync(mdFile, md.join("\n"), "utf8");
  return [csv, mdFile];
}

async function main() {
  migrate();

  const liveReady =
    process.env.DATAFORSEO_ENV === "live" &&
    process.env.DATAFORSEO_ALLOW_LIVE === "true" &&
    process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan for ${TARGET}: up to ${MAX_PAGES} x backlinks/backlinks (limit ${PAGE_SIZE}, is_indirect_link = true, status all), ` +
      `then 1 backlinks/summary per candidate (max ${MAX_CANDIDATE_SUMMARIES}). Rough estimated cost: $0.15-$0.80.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "teamstats-redirect-sources", environment: "live" as const, confirmLive: true };

  console.log(`\n=== ${TARGET}: indirect (redirected) backlinks ===`);
  const filters: unknown[] = ["is_indirect_link", "=", true];
  const all: BacklinkRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await backlinksList(TARGET, {
      ...common,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      backlinksStatusType: "all",
      filters,
    });
    totalCost += res.cost ?? 0;
    if (res.error) {
      console.log(`ERROR on page ${page + 1}: ${res.error}`);
      break;
    }
    const rows = resultItems<BacklinkRow>(res);
    console.log(`  page ${page + 1}: ${rows.length} rows (cache ${res.cacheStatus})`);
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }

  const candidateMap = extractCandidates(all);
  const candidates = [...candidateMap.values()].sort(
    (a, b) => b.referringDomains.size - a.referringDomains.size || b.bestReferrerRank - a.bestReferrerRank
  );
  console.log(`${all.length} indirect rows, ${candidates.length} distinct redirect-source domains.`);

  console.log(`\n=== Sizing the top ${Math.min(candidates.length, MAX_CANDIDATE_SUMMARIES)} candidates ===`);
  for (const c of candidates.slice(0, MAX_CANDIDATE_SUMMARIES)) {
    const s = await backlinksSummary(c.domain, common);
    totalCost += s.cost ?? 0;
    c.summary = (s.data?.tasks?.[0]?.result as Array<Record<string, unknown>> | undefined)?.[0];
    console.log(
      `  ${c.domain} | 3rd-party links=${c.links} | ref domains=${c.referringDomains.size} | dofollow=${c.dofollow} | live=${c.live} | best=${c.bestReferrer} (${c.bestReferrerRank}) | own rank=${c.summary?.rank ?? "n/a"} own ref domains=${c.summary?.referring_domains ?? "n/a"}`
    );
  }

  const written = writeExports(candidates);
  console.log(`\nWrote:\n  ${written.map((f) => path.relative(REPO_ROOT, f)).join("\n  ")}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(3)}`);
}

const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
