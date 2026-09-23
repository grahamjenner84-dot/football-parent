// Stale-competitor finder (2026-09-23). Takes our highest-potential
// keywords, pulls the top-100 Google UK results for each, then fetches
// every ranking page and works out when it was last updated. Two outputs:
//
//   1. Per keyword: pages ranking ABOVE us that haven't been touched in
//      years. Those are the positions most likely to be winnable with a
//      refresh of our own article, since Google's freshness signals and
//      the page's own decay both work in our favour.
//   2. Per domain: sites that appear across several of our keywords, rank
//      reasonably, and whose newest ranking page is years old. Those are
//      dormant-site acquisition candidates (see site-acquisition-check.ts
//      for the next step on any one of them).
//
// Keyword source, in order of preference:
//   --keywords "a,b,c"        explicit list
//   seo-opportunities.json    striking_distance entries, ranked by
//                             impressions (the file the SEO report
//                             already writes; "highest potential" here
//                             means most impressions at position 8-20)
//
// Last-updated detection, per page, best-first:
//   JSON-LD dateModified / datePublished
//   <meta property="article:modified_time" | "article:published_time" | "og:updated_time">
//   <meta itemprop="dateModified" | "datePublished">, <time datetime>
//   visible "Updated on <date>" / "Last updated <date>" text
//   Google's own SERP date (the "timestamp" field on the organic result)
// The HTTP Last-Modified header is recorded but not trusted for the
// verdict: on most CMS hosting it is the deploy time, not the edit time.
// A page with none of these is "unknown", not "stale".
//
// Outputs (dated, committed):
//   seo-data/exports/stale-competitors-<date>.csv          one row per ranking URL
//   seo-data/exports/stale-competitors-domains-<date>.csv  one row per domain
//   seo-data/exports/stale-competitors-<date>.md           readable summary
//
// Usage (after explicit user approval in-session; live DataForSEO spend):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/stale-competitor-finder.ts [--top 15] [--depth 100] [--max-age-years 2] [--keywords "a,b"]
//
// Estimated cost: one SERP call per keyword at depth 100, about $0.02
// each, so roughly $0.30 for the default 15 keywords. Page fetches are
// plain HTTP from this machine and cost nothing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const OUR_DOMAIN = "footballparent.co.uk";
const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");
const OPPORTUNITIES_FILE = path.join(REPO_ROOT, "seo-opportunities.json");
const DATE = new Date().toISOString().slice(0, 10);
const FETCH_CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 15000;
const MAX_URLS_TO_FETCH = 1200;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 FootballParentResearch/1.0";

// Sites that rank everywhere and are never for sale. Flagged, not dropped,
// so the per-keyword view still shows who is above us.
const NOT_ACQUIRABLE = [
  "youtube.com", "reddit.com", "facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com", "linkedin.com",
  "amazon.co.uk", "amazon.com", "ebay.co.uk", "wikipedia.org", "gov.uk", "bbc.co.uk", "theguardian.com", "telegraph.co.uk",
  "thefa.com", "englandfootball.com", "premierleague.com", "uefa.com", "fifa.com", "efl.com", "quora.com", "mumsnet.com",
  "sportsdirect.com", "jdsports.co.uk", "nike.com", "adidas.co.uk", "decathlon.co.uk", "prodirectsport.com",
];

type SerpItem = {
  type: string;
  rank_absolute?: number;
  domain?: string;
  url?: string;
  title?: string;
  timestamp?: string | null;
};

type KeywordInput = { keyword: string; ourPosition: number | null; impressions: number; ourPage: string };

export type PageDates = {
  modified: string | null;
  published: string | null;
  visible: string | null;
  lastModifiedHeader: string | null;
  http: number | null;
  error: string | null;
};

export type UrlRow = {
  keyword: string;
  ourPosition: number | null;
  rank: number;
  domain: string;
  url: string;
  title: string;
  googleDate: string | null;
  dates: PageDates;
  bestDate: string | null;
  ageYears: number | null;
  verdict: "stale" | "fresh" | "unknown";
  aboveUs: boolean;
  acquirable: boolean;
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function hostOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isNotAcquirable(domain: string): boolean {
  return domain === OUR_DOMAIN || NOT_ACQUIRABLE.some((d) => domain === d || domain.endsWith(`.${d}`));
}

// Normalise anything date-like to YYYY-MM-DD, or null. Rejects years that
// can't be a real page date so a stray "1970" or "2099" doesn't win.
export function toIsoDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const s = raw.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let d: Date;
  if (m) d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  else d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 2000 || y > new Date().getUTCFullYear() + 1) return null;
  return d.toISOString().slice(0, 10);
}

function walkJsonLd(node: unknown, out: { modified: string[]; published: string[] }): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) walkJsonLd(n, out);
    return;
  }
  const o = node as Record<string, unknown>;
  const mod = toIsoDate(o.dateModified);
  const pub = toIsoDate(o.datePublished);
  if (mod) out.modified.push(mod);
  if (pub) out.published.push(pub);
  for (const v of Object.values(o)) if (v && typeof v === "object") walkJsonLd(v, out);
}

const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";

// Pure HTML -> dates. Exported so it can be tested on fixture pages.
export function extractDates(html: string, lastModifiedHeader: string | null, status: number | null): PageDates {
  const out: PageDates = { modified: null, published: null, visible: null, lastModifiedHeader: toIsoDate(lastModifiedHeader), http: status, error: null };
  const jsonld = { modified: [] as string[], published: [] as string[] };
  const ldRe = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = ldRe.exec(html))) {
    try {
      walkJsonLd(JSON.parse(m[1].trim()), jsonld);
    } catch {
      // Malformed JSON-LD is common; fall through to the meta tags.
    }
  }
  const meta = (names: string[]): string | null => {
    for (const n of names) {
      const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)\\s*=\\s*["']${n}["'][^>]*content\\s*=\\s*["']([^"']+)["']`, "i");
      const re2 = new RegExp(`<meta[^>]+content\\s*=\\s*["']([^"']+)["'][^>]*(?:property|name|itemprop)\\s*=\\s*["']${n}["']`, "i");
      const hit = html.match(re) ?? html.match(re2);
      const iso = toIsoDate(hit?.[1]);
      if (iso) return iso;
    }
    return null;
  };
  const timeEl = (): string | null => {
    const hits = [...html.matchAll(/<time[^>]+datetime\s*=\s*["']([^"']+)["']/gi)].map((h) => toIsoDate(h[1])).filter((x): x is string => Boolean(x));
    return hits.length ? hits.sort().at(-1)! : null;
  };
  const visible = (): string | null => {
    const re = new RegExp(`(?:last\\s+updated|updated\\s+on|updated|last\\s+modified|reviewed\\s+on)\\s*:?\\s*(?:on\\s+)?(\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\.?\\s+\\d{4}|(?:${MONTHS})\\.?\\s+\\d{1,2},?\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4})`, "i");
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
    const hit = text.match(re);
    if (!hit) return null;
    const cleaned = hit[1].replace(/(\d)(st|nd|rd|th)/, "$1");
    // UK day/month/year for slash dates.
    const uk = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return toIsoDate(uk ? `${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}` : cleaned);
  };

  out.modified = (jsonld.modified.sort().at(-1) ?? null) || meta(["article:modified_time", "og:updated_time", "dateModified", "last-modified", "revised"]);
  out.published = (jsonld.published.sort().at(-1) ?? null) || meta(["article:published_time", "datePublished", "date", "pubdate", "publish_date"]) || timeEl();
  out.visible = visible();
  return out;
}

export function bestDate(d: PageDates, googleDate: string | null): string | null {
  const candidates = [d.modified, d.published, d.visible, toIsoDate(googleDate)].filter((x): x is string => Boolean(x));
  return candidates.length ? candidates.sort().at(-1)! : null;
}

function ageYears(iso: string | null): number | null {
  if (!iso) return null;
  return Math.round(((Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 3600 * 1000)) * 10) / 10;
}

async function fetchDates(url: string): Promise<PageDates> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8", "accept-language": "en-GB,en;q=0.9" } });
    const ct = res.headers.get("content-type") ?? "";
    const lm = res.headers.get("last-modified");
    if (!ct.includes("html")) return { modified: null, published: null, visible: null, lastModifiedHeader: toIsoDate(lm), http: res.status, error: `non-html (${ct.split(";")[0]})` };
    const html = (await res.text()).slice(0, 1_500_000);
    return extractDates(html, lm, res.status);
  } catch (err) {
    return { modified: null, published: null, visible: null, lastModifiedHeader: null, http: null, error: err instanceof Error ? err.name === "AbortError" ? "timeout" : err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

function loadKeywords(top: number): KeywordInput[] {
  const explicit = arg("keywords");
  if (explicit) {
    return explicit.split(",").map((k) => k.trim()).filter(Boolean).map((keyword) => ({ keyword, ourPosition: null, impressions: 0, ourPage: "" }));
  }
  if (!fs.existsSync(OPPORTUNITIES_FILE)) {
    throw new Error(`No --keywords given and ${path.relative(REPO_ROOT, OPPORTUNITIES_FILE)} not found. Run scripts/generate-seo-opportunities.mjs first or pass --keywords.`);
  }
  const data = JSON.parse(fs.readFileSync(OPPORTUNITIES_FILE, "utf8")) as { opportunities?: Array<{ type?: string; query?: string; page?: string; position?: number; impressions?: number }> };
  const rows = (data.opportunities ?? []).filter((o) => o.type === "striking_distance" && o.query);
  // One row per query (a query can be listed against several pages): keep the best position.
  const byQuery = new Map<string, KeywordInput>();
  for (const o of rows) {
    const cur = byQuery.get(o.query!);
    const cand: KeywordInput = { keyword: o.query!, ourPosition: o.position ?? null, impressions: o.impressions ?? 0, ourPage: o.page ?? "" };
    if (!cur || cand.impressions > cur.impressions) byQuery.set(o.query!, cand);
  }
  return [...byQuery.values()].sort((a, b) => b.impressions - a.impressions).slice(0, top);
}

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(file: string, header: string[], rows: unknown[][]): void {
  fs.writeFileSync(file, [header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n") + "\n", "utf8");
}

export type DomainSummary = {
  domain: string;
  keywords: Set<string>;
  bestRank: number;
  pagesChecked: number;
  newestDate: string | null;
  oldestDate: string | null;
  unknownPages: number;
  verdict: "stale" | "fresh" | "unknown";
  acquirable: boolean;
  sampleUrl: string;
};

export function summariseDomains(rows: UrlRow[], maxAgeYears: number): DomainSummary[] {
  const byDomain = new Map<string, DomainSummary>();
  const seenUrl = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.domain) continue;
    let d = byDomain.get(r.domain);
    if (!d) {
      d = { domain: r.domain, keywords: new Set(), bestRank: r.rank, pagesChecked: 0, newestDate: null, oldestDate: null, unknownPages: 0, verdict: "unknown", acquirable: r.acquirable, sampleUrl: r.url };
      byDomain.set(r.domain, d);
      seenUrl.set(r.domain, new Set());
    }
    d.keywords.add(r.keyword);
    if (r.rank < d.bestRank) {
      d.bestRank = r.rank;
      d.sampleUrl = r.url;
    }
    const urls = seenUrl.get(r.domain)!;
    if (urls.has(r.url)) continue;
    urls.add(r.url);
    d.pagesChecked += 1;
    if (r.bestDate) {
      if (!d.newestDate || r.bestDate > d.newestDate) d.newestDate = r.bestDate;
      if (!d.oldestDate || r.bestDate < d.oldestDate) d.oldestDate = r.bestDate;
    } else {
      d.unknownPages += 1;
    }
  }
  const cutoff = new Date(Date.now() - maxAgeYears * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  for (const d of byDomain.values()) {
    if (!d.newestDate) d.verdict = "unknown";
    else d.verdict = d.newestDate < cutoff ? "stale" : "fresh";
  }
  // Acquisition candidates first: stale, acquirable, seen on several keywords, ranking somewhere useful.
  const score = (d: DomainSummary) => (d.verdict === "stale" ? 1000 : 0) + (d.acquirable ? 500 : 0) + d.keywords.size * 20 - Math.min(d.bestRank, 100);
  return [...byDomain.values()].sort((a, b) => score(b) - score(a));
}

export function writeExports(rows: UrlRow[], domains: DomainSummary[], inputs: KeywordInput[], maxAgeYears: number, exportDir = EXPORT_DIR, date = DATE): string[] {
  fs.mkdirSync(exportDir, { recursive: true });
  const urlCsv = path.join(exportDir, `stale-competitors-${date}.csv`);
  writeCsv(
    urlCsv,
    ["keyword", "our_position", "rank", "above_us", "domain", "url", "title", "verdict", "best_date", "age_years", "date_modified", "date_published", "visible_updated", "google_serp_date", "last_modified_header", "http", "fetch_error", "acquirable"],
    rows.map((r) => [r.keyword, r.ourPosition, r.rank, r.aboveUs, r.domain, r.url, r.title, r.verdict, r.bestDate, r.ageYears, r.dates.modified, r.dates.published, r.dates.visible, toIsoDate(r.googleDate), r.dates.lastModifiedHeader, r.dates.http, r.dates.error, r.acquirable])
  );
  const domCsv = path.join(exportDir, `stale-competitors-domains-${date}.csv`);
  writeCsv(
    domCsv,
    ["domain", "verdict", "newest_date", "oldest_date", "keywords_seen", "best_rank", "pages_checked", "unknown_pages", "acquirable", "sample_url", "keywords"],
    domains.map((d) => [d.domain, d.verdict, d.newestDate, d.oldestDate, d.keywords.size, d.bestRank, d.pagesChecked, d.unknownPages, d.acquirable, d.sampleUrl, [...d.keywords].join(" | ")])
  );

  const md: string[] = [];
  md.push(`# Stale competitors - ${date}`);
  md.push("");
  md.push(`${inputs.length} keywords, top 100 UK results each. "Stale" means the page's newest detectable date is more than ${maxAgeYears} years old. "Unknown" means no date could be found, which is not evidence either way. HTTP Last-Modified is recorded but not used for the verdict.`);
  md.push("");
  md.push("## Stale pages ranking above us, by keyword");
  md.push("");
  for (const k of inputs) {
    const kr = rows.filter((r) => r.keyword === k.keyword);
    const stale = kr.filter((r) => r.aboveUs && r.verdict === "stale").sort((a, b) => a.rank - b.rank);
    const fresh = kr.filter((r) => r.aboveUs && r.verdict === "fresh").length;
    const unknown = kr.filter((r) => r.aboveUs && r.verdict === "unknown").length;
    md.push(`### ${k.keyword}`);
    md.push("");
    md.push(`Our position: ${k.ourPosition ?? "not ranking / not given"}${k.impressions ? `, ${k.impressions} impressions` : ""}${k.ourPage ? `, page ${k.ourPage.replace("https://www.footballparent.co.uk", "")}` : ""}. Above us: ${stale.length} stale, ${fresh} fresh, ${unknown} unknown.`);
    md.push("");
    if (stale.length) {
      md.push("| Rank | Domain | Last updated | Age (yrs) | Page |");
      md.push("|---|---|---|---|---|");
      for (const r of stale) md.push(`| ${r.rank} | ${r.domain}${r.acquirable ? "" : " (not acquirable)"} | ${r.bestDate} | ${r.ageYears} | ${r.url} |`);
      md.push("");
    }
  }
  md.push("## Domains: acquisition candidates first");
  md.push("");
  md.push("Stale, acquirable, seen across several of our keywords, ranking somewhere useful. Run `site-acquisition-check.ts` on any row worth a look.");
  md.push("");
  md.push("| Domain | Verdict | Newest page date | Keywords seen | Best rank | Pages checked | Sample page |");
  md.push("|---|---|---|---|---|---|---|");
  for (const d of domains.filter((d) => d.domain !== OUR_DOMAIN).slice(0, 80)) {
    md.push(`| ${d.domain}${d.acquirable ? "" : " (not acquirable)"} | ${d.verdict} | ${d.newestDate ?? ""} | ${d.keywords.size} | ${d.bestRank} | ${d.pagesChecked}${d.unknownPages ? ` (${d.unknownPages} undated)` : ""} | ${d.sampleUrl} |`);
  }
  md.push("");
  md.push(`Exports: \`${path.relative(REPO_ROOT, urlCsv)}\`, \`${path.relative(REPO_ROOT, domCsv)}\`.`);
  md.push("");
  const mdFile = path.join(exportDir, `stale-competitors-${date}.md`);
  fs.writeFileSync(mdFile, md.join("\n"), "utf8");
  return [urlCsv, domCsv, mdFile];
}

async function main() {
  migrate();
  const top = Number(arg("top") ?? 15);
  const depth = Number(arg("depth") ?? 100);
  const maxAgeYears = Number(arg("max-age-years") ?? 2);
  const inputs = loadKeywords(top);

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Keywords (${inputs.length}):`);
  for (const k of inputs) console.log(`  ${k.keyword}${k.ourPosition ? ` | our pos ${k.ourPosition}` : ""}${k.impressions ? ` | ${k.impressions} impressions` : ""}`);
  console.log(`\nPlan: ${inputs.length} x serp/google/organic/live/advanced at depth ${depth} (about $${(0.002 * (depth / 10)).toFixed(3)} each), then plain HTTP fetches of up to ${MAX_URLS_TO_FETCH} ranking pages. Rough estimated cost: $${(inputs.length * 0.002 * (depth / 10)).toFixed(2)}.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "stale-competitor-finder", environment: "live" as const, confirmLive: true };
  const serpRows: Array<{ input: KeywordInput; item: SerpItem }> = [];
  for (const k of inputs) {
    const res = await googleOrganicSerp(k.keyword, { ...common, depth });
    totalCost += res.cost ?? 0;
    if (res.error || !res.data) {
      console.log(`  SERP ERROR "${k.keyword}": ${res.error}`);
      continue;
    }
    const items = ((res.data.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? []).filter((i) => i.type === "organic" && i.url);
    const ours = items.find((i) => hostOf(i.url) === OUR_DOMAIN);
    if (ours?.rank_absolute && !k.ourPosition) k.ourPosition = ours.rank_absolute;
    console.log(`  "${k.keyword}": ${items.length} organic results (cache ${res.cacheStatus})${ours ? `, we are #${ours.rank_absolute}` : ", we are not in the top results"}`);
    for (const item of items) serpRows.push({ input: k, item });
  }

  const uniqueUrls = [...new Set(serpRows.map((r) => r.item.url!).filter((u) => hostOf(u) !== OUR_DOMAIN))].slice(0, MAX_URLS_TO_FETCH);
  console.log(`\nFetching ${uniqueUrls.length} unique pages (${FETCH_CONCURRENCY} at a time)...`);
  let done = 0;
  const fetched = new Map<string, PageDates>();
  await mapLimit(uniqueUrls, FETCH_CONCURRENCY, async (u) => {
    fetched.set(u, await fetchDates(u));
    done += 1;
    if (done % 50 === 0) console.log(`  ${done}/${uniqueUrls.length}`);
  });

  const cutoff = new Date(Date.now() - maxAgeYears * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const rows: UrlRow[] = serpRows.map(({ input, item }) => {
    const domain = hostOf(item.url);
    const dates = fetched.get(item.url!) ?? { modified: null, published: null, visible: null, lastModifiedHeader: null, http: null, error: domain === OUR_DOMAIN ? "own page, not fetched" : "not fetched" };
    const best = bestDate(dates, item.timestamp ?? null);
    const rank = item.rank_absolute ?? 0;
    return {
      keyword: input.keyword,
      ourPosition: input.ourPosition,
      rank,
      domain,
      url: item.url!,
      title: item.title ?? "",
      googleDate: item.timestamp ?? null,
      dates,
      bestDate: best,
      ageYears: ageYears(best),
      verdict: best ? (best < cutoff ? "stale" : "fresh") : "unknown",
      aboveUs: input.ourPosition ? rank < input.ourPosition : true,
      acquirable: !isNotAcquirable(domain),
    };
  });

  const domains = summariseDomains(rows.filter((r) => r.domain !== OUR_DOMAIN), maxAgeYears);
  const written = writeExports(rows, domains, inputs, maxAgeYears);

  const staleAbove = rows.filter((r) => r.aboveUs && r.verdict === "stale");
  console.log(`\n${rows.length} ranking rows, ${staleAbove.length} stale pages above us, ${domains.filter((d) => d.verdict === "stale" && d.acquirable).length} stale acquirable domains.`);
  console.log(`Wrote:\n  ${written.map((f) => path.relative(REPO_ROOT, f)).join("\n  ")}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(3)}`);
}

const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
