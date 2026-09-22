// Step 3 (cheap triage before spending WebFetch calls) of the playing-time
// prospecting brief. Reads playing-time-prospecting-candidates.json, drops
// obvious D-fit (professional football, betting, fantasy, video games,
// unrelated sports, dictionaries/wikis, retail product pages), scores the
// rest by title/description relevance, and writes a ranked shortlist for
// manual WebFetch-based classification (WebFetch isn't callable from a
// script - the agent runs it per-URL in the next stage).
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../shared/env";

// Social platforms aren't backlink-insertable articles, and known
// competitor/self domains would never plausibly link to the app - both are
// worth recording for visibility but not worth spending a WebFetch call on.
const DOMAIN_EXCLUDE = new Set([
  "footballparent.co.uk", "www.footballparent.co.uk",
  "facebook.com", "www.facebook.com", "m.facebook.com",
  "tiktok.com", "www.tiktok.com",
  "reddit.com", "www.reddit.com", "old.reddit.com",
  "twitter.com", "x.com", "www.x.com",
  "instagram.com", "www.instagram.com",
  "youtube.com", "www.youtube.com", "m.youtube.com",
  "pinterest.com", "www.pinterest.com",
  "linkedin.com", "www.linkedin.com",
]);

const COMPETITOR_DOMAINS = new Set([
  "playingtimetracker.com", "www.playingtimetracker.com",
  "playingtimecalculator.com", "www.playingtimecalculator.com",
  "fairplayfc.co.uk", "www.fairplayfc.co.uk",
  "grassrootscoach.app", "www.grassrootscoach.app",
  "benchapp.com", "www.benchapp.com",
  "teamstats.net", "www.teamstats.net",
  "mingle.sport", "www.mingle.sport",
  "mycoachfootball.com", "www.mycoachfootball.com",
  "spond.com", "www.spond.com",
  "4dot6digital.com", "www.4dot6digital.com",
  "footballgpt.co", "www.footballgpt.co",
  "juniorgrassrootshub.com", "www.juniorgrassrootshub.com",
  "grassrootsfootballuk.com", "www.grassrootsfootballuk.com",
  "teamgrassroots.co.uk", "www.teamgrassroots.co.uk",
  "diamondfootball.com", "www.diamondfootball.com",
]);

const D_EXCLUDE = [
  /\bpremier league\b|\befl championship\b|\bbundesliga\b|\bla liga\b|\bserie a\b|\bligue 1\b|\bchampions league\b|\beuropa league\b/i,
  /\btransfer (news|window|rumour)|match report|player ratings|injury update\b/i,
  /\bman(chester)? (utd|united|city) f\.?c\.?\b|\bliverpool fc\b|\barsenal fc\b|\bchelsea fc\b|\breal madrid\b|\bbarcelona fc\b/i,
  /\bodds\b|\bbetting\b|bet365|betfair|\bacca\b|free bet/i,
  /fantasy (football|premier league)|\bfpl\b/i,
  /\bfifa 2[0-9]\b|ea sports fc|career mode|ultimate team|\bps5\b|\bxbox\b/i,
  /wikipedia\.org|dictionary\.com|thefreedictionary|merriam-webster/i,
  /\/product\/|\/products\/|add to (basket|cart)|amazon\.co\.uk|amazon\.com|ebay\.|etsy\.com/i,
  /\bbasketball\b|\bcricket\b|\brugby\b|\bice hockey\b|\bbaseball\b|\bnetball\b|\bvolleyball\b/i,
  /football manager (20|24|25|26)|\bfm2[0-9]\b/i,
];

const APP_STORE_EXCLUDE = new Set(["apps.apple.com", "play.google.com", "www.apps.apple.com"]);

const STRONG_PHRASES = [
  /equal playing time/i, /fair playing time/i, /equal game time/i, /fair game time/i,
  /playing time policy/i, /game time policy/i, /substitution (rules|policy|management)/i,
  /squad rotation/i, /player rotation/i, /rolling substitut/i, /rotation policy/i,
  /track(ing)? (player )?minutes/i, /track(ing)? playing time/i, /minimum playing time/i,
  /mandatory playing time/i, /fair play policy/i, /coach favou?ritism/i,
];
const CONTEXT_WORDS = /\b(youth|junior|grassroots|kids?|children|mini|academy|coach(ing)?|parent|club|team|league|under[- ]?\d|u\d{1,2})\b/i;
const TOPIC_WORDS = /\bplaying time\b|\bgame time\b|\bsubstitut|\brotation\b|\bsquad\b|\bfair(ness)?\b|\bequal\b|\bminutes\b|\blineup\b|\bline[- ]up\b/i;

type Candidate = {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  position: number | null;
  foundVia: string[];
  locations: string[];
};

function score(c: Candidate): number {
  const text = `${c.title ?? ""} ${c.description ?? ""}`;
  let s = 0;
  for (const p of STRONG_PHRASES) if (p.test(text)) s += 10;
  if (TOPIC_WORDS.test(text)) s += 3;
  if (CONTEXT_WORDS.test(text)) s += 2;
  if (c.foundVia.length > 1) s += Math.min(c.foundVia.length - 1, 4); // surfaced by multiple queries = more central
  if (c.position && c.position <= 10) s += 1;
  return s;
}

function main() {
  const inPath = path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-candidates.json");
  const data = JSON.parse(fs.readFileSync(inPath, "utf8")) as { candidates: Record<string, Candidate>; searchedKeywords: string[]; totalCost: number };
  const all = Object.values(data.candidates);

  const excluded: Candidate[] = [];
  const competitors: Candidate[] = [];
  const survivors: Candidate[] = [];
  for (const c of all) {
    const domainKey = c.domain.replace(/^www\./, "");
    if (DOMAIN_EXCLUDE.has(c.domain) || DOMAIN_EXCLUDE.has(domainKey)) {
      excluded.push(c);
      continue;
    }
    if (COMPETITOR_DOMAINS.has(c.domain) || COMPETITOR_DOMAINS.has(domainKey)) {
      competitors.push(c);
      continue;
    }
    if (APP_STORE_EXCLUDE.has(c.domain) || APP_STORE_EXCLUDE.has(domainKey)) {
      excluded.push(c);
      continue;
    }
    const text = `${c.title ?? ""} ${c.description ?? ""} ${c.domain} ${c.url}`;
    if (D_EXCLUDE.some((p) => p.test(text))) {
      excluded.push(c);
    } else {
      survivors.push(c);
    }
  }

  const ranked = survivors
    .map((c) => ({ ...c, _score: score(c) }))
    .sort((a, b) => b._score - a._score);

  const outPath = path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-shortlist.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        rawUrlCount: all.reduce((sum, c) => sum + c.foundVia.length, 0),
        uniqueUrlCount: all.length,
        keywordsSearched: data.searchedKeywords.length,
        dExcludedCount: excluded.length,
        competitorCount: competitors.length,
        competitors: competitors.map((c) => ({ domain: c.domain, url: c.url, title: c.title })),
        survivorCount: survivors.length,
        ranked,
      },
      null,
      2
    )
  );

  console.log(`Total unique URLs: ${all.length}`);
  console.log(`Raw URL occurrences (across all queries): ${all.reduce((sum, c) => sum + c.foundVia.length, 0)}`);
  console.log(`D-excluded by cheap triage: ${excluded.length}`);
  console.log(`Competitor/self domains set aside: ${competitors.length}`);
  console.log(`Survivors ranked for WebFetch classification: ${survivors.length}`);
  console.log(`\nTop 40 by score:`);
  for (const c of ranked.slice(0, 40)) {
    console.log(`  [${(c as any)._score}] ${c.domain} | ${c.title} | ${c.url}`);
  }
  console.log(`\nWrote shortlist to ${outPath}`);
}

main();
