// Step 8/9 of the playing-time prospecting brief: score every A/B/C
// prospect and write the final CSV-ready table, sorted by Opportunity
// Score descending.
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../shared/env";
import { writeCsv } from "../shared/csv";

type Row = {
  url: string; domain: string; fit: string; topic: string; why: string;
  domainType: string; country: string; orgName?: string; notes?: string;
  httpStatus: number | null; httpNote: string;
};

const HIGH_TRUST_TYPES = new Set(["governing body", "charity", "university"]);
const MED_TRUST_TYPES = new Set(["football publication", "coaching organisation", "parenting publication"]);
const SMALL_CLUB_TYPES = new Set(["grassroots club"]);

function domainAuthorityScore(rank: number | undefined, domainType: string): number {
  const r = rank ?? 0;
  let base = Math.min(16, (r / 700) * 16);
  if (HIGH_TRUST_TYPES.has(domainType)) base += 4;
  else if (MED_TRUST_TYPES.has(domainType)) base += 2;
  return Math.min(20, Math.round(base * 10) / 10);
}

function pageStrengthScore(url: string, fit: string): number {
  const isOfficialDoc = /\.pdf|\.ashx|\/policies\/|\/policy\//i.test(url) || /policy|guidance/i.test(url);
  let base = fit === "A" ? 11 : fit === "B" ? 8 : 5;
  if (isOfficialDoc) base += 3;
  return Math.min(15, base);
}

// Manual downweights for specific low-value pages identified during
// classification (dated/already-answered forum thread, syndicated mirror,
// generic non-football Excel tutorial, unverified possible-competitor site).
const LIKELIHOOD_OVERRIDES: Record<string, number> = {
  "https://learn.microsoft.com/en-us/answers/questions/5137254/team-sport-equal-game-time-and-position-calculator": 3,
  "https://onesportvoice.wordpress.com/2010/07/27/a-question-about-equal-playing-time-in-youth-sports/": 4,
  "https://www.excelcampus.com/tips/equal-playing-time-challenge/": 4,
};

function likelihoodScore(fit: string, url: string): number {
  if (LIKELIHOOD_OVERRIDES[url] !== undefined) return LIKELIHOOD_OVERRIDES[url];
  return fit === "A" ? 9 : fit === "B" ? 6 : 4;
}

function ukGrassrootsYouthScore(country: string, topic: string, domainType: string): number {
  const isFootballSpecific = !/general|not football-specific/i.test(topic);
  if (country === "UK" && isFootballSpecific) return 10;
  if (["UK", "US", "Canada", "Australia", "Ireland"].includes(country) && isFootballSpecific) return 8;
  if (!isFootballSpecific) return 5;
  return 6;
}

const OUTREACH_EASE_OVERRIDES: Record<string, number> = {
  "thefa.com": 1,
  "learn.englandfootball.com": 1,
  "learn.microsoft.com": 1,
  "underarmour.com": 1,
};

function outreachEaseScore(domain: string, domainType: string): number {
  if (OUTREACH_EASE_OVERRIDES[domain] !== undefined) return OUTREACH_EASE_OVERRIDES[domain];
  if (SMALL_CLUB_TYPES.has(domainType)) return 5;
  if (domainType === "forum") return 2;
  return 3;
}

function fitRelevanceScore(fit: string): number {
  return fit === "A" ? 39 : fit === "B" ? 25 : 12;
}

function outreachType(fit: string, notes: string | undefined): string {
  if (notes && /verify|lower-priority|possible competitor|syndicated/i.test(notes)) return "Lower-priority prospect";
  return "App resource outreach";
}

function primaryTopicLabel(topic: string): string {
  if (/substitut/i.test(topic)) return "Substitution management";
  if (/rotation/i.test(topic)) return "Squad/player rotation";
  if (/tracking|tracker|spreadsheet|calculator/i.test(topic)) return "Tracking playing time";
  if (/parent/i.test(topic)) return "Parent conflict over playing time";
  if (/maximum|welfare/i.test(topic)) return "Playing-time welfare limits";
  return "Equal/fair playing time policy";
}

async function main() {
  const rows = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-abc-status.json"), "utf8")) as Row[];
  const bulkRanksRaw = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-bulkranks.json"), "utf8")) as Array<{ target?: string; rank?: number }>;
  const rankByDomain = new Map(bulkRanksRaw.map((r) => [r.target, r.rank]));
  const queue = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-webfetch-final-queue.json"), "utf8")) as Array<{ url: string; foundVia: string[] }>;
  const foundViaByUrl = new Map(queue.map((q) => [q.url, q.foundVia]));

  const scored = rows.map((r) => {
    const bareDomain = r.domain.replace(/^www\./, "");
    const rank = rankByDomain.get(bareDomain);
    const relevance = fitRelevanceScore(r.fit);
    const authority = domainAuthorityScore(rank, r.domainType);
    const strength = pageStrengthScore(r.url, r.fit);
    const likelihood = likelihoodScore(r.fit, r.url);
    const ukRelevance = ukGrassrootsYouthScore(r.country, r.topic, r.domainType);
    const ease = outreachEaseScore(bareDomain, r.domainType);
    const score = Math.round(relevance + authority + strength + likelihood + ukRelevance + ease);
    const foundVia = foundViaByUrl.get(r.url) ?? [];
    return {
      score,
      fit: r.fit,
      domain: r.domain,
      title: r.topic,
      url: r.url,
      country: r.country,
      primaryTopic: primaryTopicLabel(r.topic),
      searchPhrase: foundVia[0] ?? "",
      why: r.why,
      domainRank: rank ?? "n/a",
      urlAuthority: "n/a (DataForSEO backlinks/page_rank not pulled per-URL; domain-level bulk_rank used as the authority signal)",
      spamScore: "n/a (not available from bulk_ranks; would require a per-domain summary call)",
      httpStatus: r.httpStatus,
      outreachType: outreachType(r.fit, r.notes),
      notes: [r.notes, r.orgName ? `Org: ${r.orgName}` : null, `Domain type: ${r.domainType}`].filter(Boolean).join(" | "),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const header = [
    "Opportunity Score", "Fit Grade", "Domain", "Article title", "URL", "Country", "Primary topic",
    "Search phrase that found it", "Why the app fits this specific article", "Domain authority/rank metric (DataForSEO bulk_ranks, screening signal only)",
    "URL/page authority metric", "Spam score", "HTTP status", "Outreach type", "Notes",
  ];
  const csvRows = [header, ...scored.map((s) => [
    s.score, s.fit, s.domain, s.title, s.url, s.country, s.primaryTopic, s.searchPhrase, s.why,
    s.domainRank, s.urlAuthority, s.spamScore, s.httpStatus, s.outreachType, s.notes,
  ])];

  const csvPath = path.join(REPO_ROOT, "seo-data", "exports", "playing-time-app-backlink-prospects-2026-09-19.csv");
  fs.writeFileSync(csvPath, writeCsv(csvRows));
  console.log(`Wrote ${scored.length} scored rows to ${csvPath}`);

  const jsonPath = path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-final-scored.json");
  fs.writeFileSync(jsonPath, JSON.stringify(scored, null, 2));
  console.log(`Wrote scored JSON to ${jsonPath}`);

  console.log("\nTop 15:");
  for (const s of scored.slice(0, 15)) console.log(`  ${s.score}  [${s.fit}]  ${s.domain}  ${s.outreachType}`);
}

main();
