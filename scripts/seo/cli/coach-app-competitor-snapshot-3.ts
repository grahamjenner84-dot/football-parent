// Third Coach App competitor pull (2026-10-18), following the Facebook-group
// app sweep (seo-data/exports/fb-group-app-competitors-2026-10-18.*).
//
// Part 1: snapshot of 14 apps not yet pulled, plus a like-for-like refresh of
// coachmeister.com, subtimeapp.com, statzoapp.com, fairsub.app,
// pitch-planner.app and us. Per domain: UK rank overview, top 100 ranked
// keywords by etv (plus a game-time filtered pull when the top 100 does not
// cover every keyword), backlinks summary, top 50 referring domains, and the
// backlink list classified for county FA / league / club / Facebook links.
// Any component already pulled in the last 7 days (snapshots 1 and 2,
// 2026-10-16) is read from those files rather than paid for again.
//
// Part 2: why fairplaycoach.co.uk outranks us on the app terms. Volume and
// difficulty for the target terms, a fresh UK SERP per term, and on-page
// fields for the fairplaycoach.co.uk URLs those SERPs return. Per-URL link
// counts are derived from the Part 1 backlink lists, not extra calls.
//
// Without the live gate it only prints the planned calls and an estimated
// cost. Nothing is sent.
//
// Usage:
//   npx tsx scripts/seo/cli/coach-app-competitor-snapshot-3.ts            (plan only)
//   (after explicit user approval in-session)
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-app-competitor-snapshot-3.ts
//   Add --part 1 or --part 2 to run one part.
import fs from "node:fs";
import { assessProspect } from "../../../lib/outreach/quality";
import { migrate } from "../database/migrate";
import { backlinksList, backlinksSummary, referringDomains } from "../dataforseo/endpoints/backlinks";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { bulkKeywordDifficulty, domainRankOverview, keywordOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { contentParsingLive, instantPages } from "../dataforseo/endpoints/on_page";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { citationSummary, extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const US = "footballparent.co.uk";
const NEW = [
  "pocketgaffer.co.uk",
  "fairplaycoach.co.uk",
  "fairplayfc.co.uk",
  "matchflow.co.uk",
  "gaffer-app.co.uk",
  "getpytch.com",
  "boxlytics.app",
  "teammate.football",
  "centrecircleapp.com",
  "club-roots.co.uk",
  "everyplayer.app",
  "onpitch.app",
  "footballgpt.co",
  "thesportingresource.co.uk",
  // Added 2026-10-18 on request: the one bigger competitor with real search
  // reach (17,759 UK keywords in the 10-16 snapshot).
  "teamstats.net",
];
const REFRESH = ["coachmeister.com", "subtimeapp.com", "statzoapp.com", "fairsub.app", "pitch-planner.app", US];

const TERMS = [
  "equal playing time app grassroots football",
  "fair playing time football coaches app",
  "fair playing time app",
  "equal game time app",
  "football substitution app",
  "playing time app football",
  "grassroots football substitution app",
  "equal playing time app",
];
const OUR_PAGES = [
  "/football-parent-coach-app",
  "/coaching/equal-playing-time-calculator",
  "/coaching/best-grassroots-football-apps",
  "/coaching/equal-playing-time-in-grassroots-football",
];
const RIVAL = "fairplaycoach.co.uk";
const MAX_RIVAL_PAGES = 5;
const SERP_DEPTH = 30;

const RANKED_TOP = 100;
const BACKLINK_PAGE = 1000;
const REUSE_MAX_DAYS = 7;
const PRIOR = [
  { file: "seo-data/exports/coach-app-competitor-snapshot-2026-10-16.json", date: "2026-10-16" },
  { file: "seo-data/exports/coach-app-competitor-snapshot-2-2026-10-16.json", date: "2026-10-16" },
];

// Local flag for game-time keywords. The API-side filter below is broader
// (DataForSEO allows 8 conditions), and this regex narrows its output.
const GAME_TIME = /\b(playing|game|play|match|pitch)[ -]?time\b|\bminutes\b|\bsubs?\b|substitut|rotation|line[ -]?ups?\b|team (selection|selector|picker|sheet)|squad (selection|rotation|picker)|\bcoach(ing|es)? app|\bfootball (coach(ing)? )?app|grassroots .*app|\bapp\b.*(coach|grassroots|football)/i;
const GAME_TIME_API_FILTER = [
  ["keyword_data.keyword", "like", "%playing time%"], "or",
  ["keyword_data.keyword", "like", "%game time%"], "or",
  ["keyword_data.keyword", "like", "%sub%"], "or",
  ["keyword_data.keyword", "like", "%rotation%"], "or",
  ["keyword_data.keyword", "like", "%line%up%"], "or",
  ["keyword_data.keyword", "like", "%selec%"], "or",
  ["keyword_data.keyword", "like", "%app%"], "or",
  ["keyword_data.keyword", "like", "%minutes%"],
];
// Backlinks from FA / league / club / Facebook hosts, for domains with more
// backlinks than one page returns. Classified locally afterwards.
const GRASSROOTS_LINK_FILTER = [
  ["domain_from", "like", "%fa.com%"], "or",
  ["domain_from", "like", "%englandfootball%"], "or",
  ["domain_from", "like", "%league%"], "or",
  ["domain_from", "like", "%fc%"], "or",
  ["domain_from", "like", "%club%"], "or",
  ["domain_from", "like", "%facebook%"], "or",
  ["domain_from", "like", "%pitchero%"], "or",
  ["domain_from", "like", "%junior%"],
];

// Estimated per-call costs (USD), from this machine's api_usage history of
// live calls (averages, rounded up). Estimates, not quotes.
const COST = {
  summary: 0.0241,
  overview: 0.0122,
  rankedTop: 0.024,
  rankedFiltered: 0.02,
  refDomains: 0.027,
  backlinks: 0.045,
  backlinksFiltered: 0.03,
  adsVolume: 0.09,
  labsOverview: 0.0132,
  kd: 0.0125,
  serp: 0.002 * (SERP_DEPTH / 10),
  instantPage: 0.0015,
  contentParse: 0.0015,
};

type Json = Record<string, any>;
type Component = "summary" | "organic" | "rankedKeywords" | "referringDomains" | "backlinks";

function daysSince(date: string): number {
  return (Date.now() - new Date(`${date}T12:00:00Z`).getTime()) / 86_400_000;
}

// Prior pulls keyed by domain. Snapshot 2 stores our own backlink list
// under "us".
function loadPrior(): Record<string, Partial<Record<Component, { data: Json; date: string }>>> {
  const out: Record<string, Partial<Record<Component, { data: Json; date: string }>>> = {};
  for (const p of PRIOR) {
    if (!fs.existsSync(p.file) || daysSince(p.date) > REUSE_MAX_DAYS) continue;
    const json = JSON.parse(fs.readFileSync(p.file, "utf8")) as Record<string, Json>;
    for (const [key, row] of Object.entries(json)) {
      const domain = key === "us" ? US : key;
      out[domain] ??= {};
      const set = (c: Component, v: Json | null | undefined) => {
        if (v && !out[domain][c]) out[domain][c] = { data: v, date: p.date };
      };
      set("summary", row.summary);
      set("organic", row.organic);
      set("rankedKeywords", row.rankedKeywords);
      set("referringDomains", row.referringDomains);
      set("backlinks", row.backlinksAll ?? row.backlinks);
    }
  }
  return out;
}

// A prior ranked-keywords pull only stands in for "top 100 by etv" if it
// holds every keyword the domain has (it was not ordered by etv).
function priorRankedComplete(r: Json | undefined): boolean {
  return !!r && Array.isArray(r.items) && typeof r.total_count === "number" && r.items.length >= r.total_count;
}
function priorBacklinksComplete(b: Json | undefined): boolean {
  return !!b && Array.isArray(b.items) && typeof b.total_count === "number" && b.items.length >= b.total_count;
}

type PlannedCall = { part: 1 | 2; target: string; call: string; cost: number; conditional?: string; reused?: string };

function plan(prior: ReturnType<typeof loadPrior>, parts: Set<number>): PlannedCall[] {
  const calls: PlannedCall[] = [];
  if (parts.has(1)) {
    for (const d of [...NEW, ...REFRESH]) {
      const p = prior[d] ?? {};
      const add = (call: string, cost: number, reused?: string, conditional?: string) =>
        calls.push({ part: 1, target: d, call, cost: reused ? 0 : cost, reused, conditional });
      add("backlinks summary", COST.summary, p.summary && `snapshot ${p.summary.date}`);
      add("domain rank overview (UK)", COST.overview, p.organic && `snapshot ${p.organic.date}`);
      const rankedReuse = priorRankedComplete(p.rankedKeywords?.data) ? `snapshot ${p.rankedKeywords!.date} (all ${p.rankedKeywords!.data.total_count} kw)` : undefined;
      add(`ranked keywords UK, top ${RANKED_TOP} by etv`, COST.rankedTop, rankedReuse);
      if (!rankedReuse) add("ranked keywords UK, game-time filter", COST.rankedFiltered, undefined, `only if > ${RANKED_TOP} ranked keywords`);
      if (d !== US) {
        add("referring domains, top 50", COST.refDomains, p.referringDomains && `snapshot ${p.referringDomains.date} (top 100)`);
      }
      const blReuse = p.backlinks ? `snapshot ${p.backlinks.date} (${p.backlinks.data.items?.length ?? 0} of ${p.backlinks.data.total_count})` : undefined;
      add(`backlinks list, first ${BACKLINK_PAGE}`, COST.backlinks, blReuse);
      if (!priorBacklinksComplete(p.backlinks?.data)) {
        add("backlinks list, FA/league/club/Facebook filter", COST.backlinksFiltered, undefined, p.backlinks ? "prior pull is truncated" : `only if > ${BACKLINK_PAGE} backlinks`);
      }
    }
  }
  if (parts.has(2)) {
    calls.push({ part: 2, target: `${TERMS.length} terms`, call: "Google Ads search volume (UK)", cost: COST.adsVolume });
    calls.push({ part: 2, target: `${TERMS.length} terms`, call: "Labs keyword overview (volume, KD, intent)", cost: COST.labsOverview });
    calls.push({ part: 2, target: `${TERMS.length} terms`, call: "Labs bulk keyword difficulty", cost: COST.kd });
    for (const t of TERMS) calls.push({ part: 2, target: t, call: `live SERP google.co.uk desktop, depth ${SERP_DEPTH}, force refresh`, cost: COST.serp });
    calls.push({ part: 2, target: RIVAL, call: `instant_pages (JS) for homepage + up to ${MAX_RIVAL_PAGES - 1} ranking URLs`, cost: COST.instantPage * MAX_RIVAL_PAGES, conditional: "count depends on SERPs" });
    calls.push({ part: 2, target: RIVAL, call: `content_parsing (JS) for the same URLs`, cost: COST.contentParse * MAX_RIVAL_PAGES, conditional: "count depends on SERPs" });
  }
  return calls;
}

function printPlan(calls: PlannedCall[]) {
  let fixed = 0;
  let conditional = 0;
  let reused = 0;
  for (const part of [1, 2] as const) {
    const rows = calls.filter((c) => c.part === part);
    if (!rows.length) continue;
    console.log(`\n=== Part ${part} ===`);
    let lastTarget = "";
    for (const c of rows) {
      if (c.target !== lastTarget) console.log(`\n${c.target}`);
      lastTarget = c.target;
      const tag = c.reused ? `REUSE ${c.reused}` : c.conditional ? `~$${c.cost.toFixed(4)} IF ${c.conditional}` : `~$${c.cost.toFixed(4)}`;
      console.log(`  - ${c.call.padEnd(52)} ${tag}`);
      if (c.reused) reused++;
      else if (c.conditional) conditional += c.cost;
      else fixed += c.cost;
    }
  }
  const sent = calls.filter((c) => !c.reused).length;
  console.log(`\nCalls: ${sent} to send (some conditional), ${reused} reused from the last ${REUSE_MAX_DAYS} days.`);
  console.log(`Estimated cost: ~$${fixed.toFixed(2)} certain, up to ~$${(fixed + conditional).toFixed(2)} if every conditional call fires.`);
  console.log("Estimates use average live costs from api_usage. Anything already in the local cache (30-day window) is free.");
}

// ---------- classification helpers (pure) ----------

function linkKind(host: string, urlFrom: string): "county_fa" | "league" | "club" | "facebook" | null {
  const h = host.toLowerCase();
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(h)) return "facebook";
  if (/(^|\.)(thefa\.com|englandfootball\.com|[a-z]+fa\.com|faw\.cymru|scottishfa\.co\.uk|irishfa\.com)$/.test(h)) return "county_fa";
  if (/league|jfl\b|\bjpl\b|youthfootball/.test(h)) return "league";
  if (/(^|[.-])(a?j?fc|afc|jfc|club|juniors?|colts|youth)([.-]|$)|fc\.|club|pitchero\.com|clubbuzz|teamapp\.com/.test(h) || /pitchero\.com\/clubs\//.test(urlFrom)) return "club";
  return null;
}

function rankedRows(r: Json | null | undefined) {
  return ((r?.items ?? []) as Json[]).map((it) => ({
    keyword: it.keyword_data?.keyword as string,
    volume: it.keyword_data?.keyword_info?.search_volume ?? null,
    kd: it.keyword_data?.keyword_properties?.keyword_difficulty ?? null,
    position: it.ranked_serp_element?.serp_item?.rank_absolute ?? null,
    url: it.ranked_serp_element?.serp_item?.url ?? null,
    etv: it.ranked_serp_element?.serp_item?.etv ?? null,
    gameTime: GAME_TIME.test(it.keyword_data?.keyword ?? ""),
  }));
}

function hostOfUrl(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ---------- live run ----------

async function main() {
  migrate();
  const partArg = process.argv.indexOf("--part");
  const parts = new Set<number>(partArg > -1 ? [Number(process.argv[partArg + 1])] : [1, 2]);
  const prior = loadPrior();
  const calls = plan(prior, parts);

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("PLAN ONLY. Nothing sent. Live run requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true and LIVE_CONFIRM=yes for this invocation.");
    printPlan(calls);
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const common = { workflow: "coach-app-competitor-snapshot-3", environment: "live" as const, confirmLive: true };
  let cost = 0;
  const errors: string[] = [];
  const first = (label: string, r: Awaited<ReturnType<typeof backlinksSummary>>) => {
    cost += r.cacheStatus === "hit" ? 0 : r.cost ?? 0;
    if (r.error) {
      console.log(`  error (${label}): ${r.error}`);
      errors.push(`${label}: ${r.error}`);
    }
    return (r.data?.tasks?.[0]?.result?.[0] ?? null) as Json | null;
  };

  const snapshotFile = `seo-data/exports/coach-app-competitor-snapshot-3-${date}.json`;
  let snapshot: Json = fs.existsSync(snapshotFile) ? JSON.parse(fs.readFileSync(snapshotFile, "utf8")) : {};

  if (parts.has(1)) {
    const domains: Json = {};
    for (const d of [...NEW, ...REFRESH]) {
      console.log(d);
      const p = prior[d] ?? {};
      const src: Record<string, string> = {};
      const reuse = (c: Component) => (src[c] = `snapshot ${p[c]!.date}`, p[c]!.data);

      const summary = p.summary ? reuse("summary") : first(`${d} summary`, await backlinksSummary(d, common));
      const organic = p.organic ? reuse("organic") : first(`${d} overview`, await domainRankOverview(d, { ...common, limit: 1 }));

      let ranked: Json[] = [];
      let rankedTotal: number | null = null;
      if (priorRankedComplete(p.rankedKeywords?.data)) {
        ranked = rankedRows(reuse("rankedKeywords"));
        rankedTotal = p.rankedKeywords!.data.total_count;
      } else {
        const r = first(`${d} ranked`, await rankedKeywords(d, { ...common, limit: RANKED_TOP, orderBy: ["ranked_serp_element.serp_item.etv,desc"] }));
        ranked = rankedRows(r);
        rankedTotal = r?.total_count ?? null;
        if ((rankedTotal ?? 0) > ranked.length) {
          const f = first(`${d} ranked game-time`, await rankedKeywords(d, { ...common, limit: 500, filters: GAME_TIME_API_FILTER }));
          const seen = new Set(ranked.map((k) => k.keyword));
          for (const k of rankedRows(f)) if (!seen.has(k.keyword)) ranked.push(k);
        }
      }
      ranked.sort((a, b) => (b.etv ?? 0) - (a.etv ?? 0));

      let refDomains: Json[] = [];
      if (d !== US) {
        const rd = p.referringDomains ? reuse("referringDomains") : first(`${d} referring domains`, await referringDomains(d, { ...common, limit: 50 }));
        refDomains = ((rd?.items ?? []) as Json[])
          .map((x) => ({ domain: x.domain, rank: x.rank, backlinks: x.backlinks, first_seen: x.first_seen }))
          .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
          .slice(0, 50);
      }

      let blRaw: Json[] = [];
      let blTotal: number | null = null;
      if (p.backlinks) {
        const b = reuse("backlinks");
        blRaw = b.items ?? [];
        blTotal = b.total_count ?? null;
      } else {
        const b = first(`${d} backlinks`, await backlinksList(d, { ...common, limit: BACKLINK_PAGE, backlinksStatusType: "live" }));
        blRaw = b?.items ?? [];
        blTotal = b?.total_count ?? null;
      }
      if ((blTotal ?? 0) > blRaw.length) {
        const f = first(`${d} backlinks filtered`, await backlinksList(d, { ...common, limit: BACKLINK_PAGE, backlinksStatusType: "live", filters: GRASSROOTS_LINK_FILTER }));
        const seen = new Set(blRaw.map((x) => `${x.url_from}|${x.url_to}`));
        for (const x of (f?.items ?? []) as Json[]) if (!seen.has(`${x.url_from}|${x.url_to}`)) blRaw.push(x);
        src.backlinksFiltered = "live";
      }
      const backlinks = blRaw.map((x) => ({
        domain_from: x.domain_from,
        url_from: x.url_from,
        url_to: x.url_to,
        anchor: x.anchor,
        dofollow: x.dofollow,
        is_lost: x.is_lost ?? false,
        page_from_title: x.page_from_title ?? null,
        first_seen: x.first_seen,
        kind: linkKind(x.domain_from ?? "", x.url_from ?? ""),
      }));
      const grassroots = backlinks
        .filter((b) => b.kind)
        .map((b) => {
          const q = assessProspect({ url: b.url_from, title: b.page_from_title, country: null, context: b.anchor });
          return { ...b, qualityGate: q.verdict, qualityReasons: (q as Json).reasons ?? (q as Json).reason ?? null };
        });

      const m = organic?.items?.[0]?.metrics?.organic ?? {};
      domains[d] = {
        sources: src,
        overview: {
          rankedKeywords: m.count ?? 0,
          etvEstimate: m.etv ?? 0,
          pos1: m.pos_1 ?? 0,
          top3: (m.pos_1 ?? 0) + (m.pos_2_3 ?? 0),
          top10: (m.pos_1 ?? 0) + (m.pos_2_3 ?? 0) + (m.pos_4_10 ?? 0),
        },
        backlinkSummary: {
          referringDomains: summary?.referring_domains ?? null,
          backlinks: summary?.backlinks ?? null,
          rank: summary?.rank ?? null,
          spamScore: summary?.backlinks_spam_score ?? null,
        },
        rankedTotal,
        rankedKeywords: ranked,
        gameTimeKeywords: ranked.filter((k) => k.gameTime),
        topReferringDomains: refDomains,
        backlinksTotal: blTotal,
        backlinksPulled: backlinks.length,
        backlinks,
        grassrootsLinks: grassroots,
      };
    }

    // Keyword gap: game-time keywords a rival ranks top 20 for, where we are
    // absent or outside the top 20.
    const ours = new Map<string, number>();
    for (const k of (domains[US]?.rankedKeywords ?? []) as Json[]) if (k.position != null) ours.set(k.keyword, Math.min(k.position, ours.get(k.keyword) ?? 999));
    const gap: Json[] = [];
    for (const [d, row] of Object.entries(domains)) {
      if (d === US) continue;
      for (const k of (row as Json).gameTimeKeywords as Json[]) {
        if (k.position == null || k.position > 20) continue;
        const ourPos = ours.get(k.keyword) ?? null;
        if (ourPos != null && ourPos <= 20) continue;
        gap.push({ keyword: k.keyword, volume: k.volume, kd: k.kd, competitor: d, competitorPosition: k.position, competitorUrl: k.url, ourPosition: ourPos });
      }
    }
    gap.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    snapshot = { ...snapshot, date, part1: { domains, keywordGap: gap } };
  }

  if (parts.has(2)) {
    // Ads returns one result row per keyword, so read the whole result array
    // rather than first()'s result[0].
    const adsResp = await googleAdsSearchVolume(TERMS, common);
    first("ads volume", adsResp);
    const adsAll = ((adsResp.data?.tasks?.[0]?.result ?? []) as Json[]).map((r) => ({ keyword: r.keyword, adsVolume: r.search_volume, competition: r.competition, cpc: r.cpc }));
    const labs = first("labs overview", await keywordOverview(TERMS, common));
    const kd = first("kd", await bulkKeywordDifficulty(TERMS, common));
    const terms = TERMS.map((t) => {
      const a = adsAll.find((r) => r.keyword === t);
      const l = ((labs?.items ?? []) as Json[]).find((r) => r.keyword === t);
      const k = ((kd?.items ?? []) as Json[]).find((r) => r.keyword === t);
      return {
        keyword: t,
        adsVolume: a?.adsVolume ?? null,
        labsVolume: l?.keyword_info?.search_volume ?? null,
        kd: k?.keyword_difficulty ?? l?.keyword_properties?.keyword_difficulty ?? null,
        intent: l?.search_intent_info?.main_intent ?? null,
      };
    });

    const serps: Json[] = [];
    const rivalUrls = new Set<string>([`https://${RIVAL}/`]);
    for (const t of TERMS) {
      console.log(`SERP: ${t}`);
      const s = first(`serp ${t}`, await googleOrganicSerp(t, { ...common, depth: SERP_DEPTH, forceRefresh: true }));
      const items = (s?.items ?? []) as Json[];
      const organic = items
        .filter((i) => i.type === "organic")
        .map((i) => ({ position: i.rank_group, domain: (i.domain ?? "").replace(/^www\./, ""), url: i.url, title: i.title, description: i.description }));
      for (const o of organic) if (o.domain === RIVAL) rivalUrls.add(o.url);
      // AI Overview citations sometimes sit on nested items rather than the
      // top-level block (the 2026-10-04 run logged "no references" for some).
      const { aiOverview, paaQuestions } = extractSerpFeatures(items as SerpItem[]);
      const refs = [...(aiOverview?.references ?? [])];
      for (const sub of aiOverview?.items ?? []) if (typeof sub !== "string") refs.push(...(sub.references ?? []));
      const cites = citationSummary(refs);
      serps.push({
        keyword: t,
        aiOverview: aiOverview
          ? {
              present: true,
              text: (aiOverview.text ?? "").slice(0, 1500),
              citedUs: cites.cited,
              citedUsPosition: cites.position,
              citedRival: refs.some((r) => hostOfUrl(r.url ?? "") === RIVAL),
              citedDomains: cites.competitorDomains,
              references: refs.map((r) => ({ url: r.url, domain: r.domain, title: r.title })),
            }
          : { present: false },
        paaQuestions,
        features: [...new Set(items.map((i) => i.type))],
        top10: organic.filter((o) => o.position <= 10),
        ours: organic.filter((o) => o.domain === US),
        rival: organic.filter((o) => o.domain === RIVAL),
      });
    }

    const rivalPages: Json[] = [];
    for (const url of [...rivalUrls].slice(0, MAX_RIVAL_PAGES)) {
      console.log(`page: ${url}`);
      const ip = first(`instant ${url}`, await instantPages(url, { ...common, enableJavascript: true }));
      const it = (ip?.items?.[0] ?? {}) as Json;
      const cp = first(`parse ${url}`, await contentParsingLive(url, { ...common, enableJavascript: true }));
      const md: string = cp?.items?.[0]?.page_as_markdown ?? "";
      rivalPages.push({
        url,
        statusCode: it.status_code ?? null,
        title: it.meta?.title ?? null,
        description: it.meta?.description ?? null,
        h1: it.meta?.htags?.h1 ?? [],
        h2: it.meta?.htags?.h2 ?? [],
        wordCountInstant: it.meta?.content?.plain_text_word_count ?? null,
        wordCountParsed: md ? md.split(/\s+/).filter(Boolean).length : null,
        markdown: md.slice(0, 20000),
      });
    }

    // Link counts per URL from the Part 1 backlink lists.
    const p1 = snapshot.part1?.domains ?? {};
    const perUrl = (domain: string) => {
      const out: Record<string, { backlinks: number; domains: Set<string> }> = {};
      for (const b of (p1[domain]?.backlinks ?? []) as Json[]) {
        const key = (b.url_to ?? "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
        out[key] ??= { backlinks: 0, domains: new Set() };
        out[key].backlinks++;
        out[key].domains.add(b.domain_from);
      }
      return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { backlinks: v.backlinks, referringDomains: v.domains.size, from: [...v.domains] }]));
    };

    snapshot = {
      ...snapshot,
      date,
      part2: {
        terms,
        serps,
        rivalPages,
        linksPerUrl: { [RIVAL]: perUrl(RIVAL), [US]: perUrl(US), note: "Derived from the Part 1 backlink lists; complete only where backlinksPulled equals backlinksTotal." },
        ourPages: OUR_PAGES,
        rivalHosts: [...rivalUrls].map(hostOfUrl),
      },
    };
  }

  snapshot.cost = (snapshot.cost ?? 0) + cost;
  snapshot.errors = [...(snapshot.errors ?? []), ...errors];
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));
  console.log(`cost this run=$${cost.toFixed(4)} -> ${snapshotFile}`);
  if (errors.length) console.log(`${errors.length} call(s) errored, see "errors" in the output.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
