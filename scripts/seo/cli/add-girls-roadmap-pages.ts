// Adds the girls' football content strategy from the 2026-10-06 research
// session (girls-football-keyword-discovery.ts, -volume-kd.ts,
// -clickstream-check.ts, -trends-estimate.ts, -serp-check.ts) to the
// article roadmap (pages table, status='planned'), then re-exports
// seo-data/exports/article-tracker.csv. No live API calls, local DB only.
//
// Volume caveat that applies to every row: Google Ads and DataForSEO
// clickstream both withhold volume for nearly all "girls" phrasings, so
// total_target_sv holds only the measured terms; the notes carry the
// Trends ranking and GSC evidence that the real demand is larger.
//
// Run: npx tsx scripts/seo/cli/add-girls-roadmap-pages.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { exportArticleTracker } from "../exports/article-tracker";

const SITE_URL = "https://www.footballparent.co.uk";
const RESEARCH_NOTE = "Girls' football research 2026-10-06 (seo-data/exports/girls-football-*-2026-10-06.json)";

type Row = {
  path: string;
  article: string;
  category: string;
  primary: string;
  secondary: string[];
  cluster: string;
  sv: number;
  priority: "Highest" | "High" | "Medium";
  notes: string;
};

const ROADMAP: Row[] = [
  {
    path: "/girls-football/how-girls-football-works",
    article: "How Girls' Football Works: Ages, Wildcats, Squads and Leagues",
    category: "girls-football",
    primary: "girls football",
    secondary: ["football for girls", "girls football age groups", "what age can girls start playing football", "wildcats football", "fa wildcats", "squad girls football", "girls football league", "girls football club"],
    cluster: "Girls football: getting started",
    sv: 650,
    priority: "Highest",
    notes:
      "Head term of the whole girls' space: Trends puts 'girls football' ~10x 'girls football boots' (6,600/mo); Ads hides its volume. SV figure is Wildcats terms only (390+170+90). Page one has no publisher: local clubs, schools, county FA pages. Site not in top 20. PAA: 'What age can girls start playing football?', 'Is there any football for girls?'. No existing page covers Wildcats/Squad/leagues. Partly local intent, so win on the questions rather than 'near me'. Hub for the girls' cluster.",
  },
  {
    path: "/girls-football/can-girls-play-in-boys-football-teams",
    article: "Can Girls Play in Boys' Football Teams? Mixed Football Rules and Age Limits",
    category: "girls-football",
    primary: "can girls play in boys football teams",
    secondary: ["mixed football", "mixed football age limit", "mixed football rules", "girls playing in boys teams"],
    cluster: "Girls football: mixed football",
    sv: 10,
    priority: "High",
    notes:
      "Weakest page one found: YouTube, Facebook, Australian local news, Mumsnet, one club FAQ. Trends: 'mixed football' ranks alongside 'girls football team'. Related searches show the 2026/27 youth football changes, so fact-check current FA mixed-football rules before writing. Links to and from the how-girls-football-works hub.",
  },
  {
    path: "/girls-football/girls-academy-trials-by-club",
    article: "Girls' Academy Trials 2026/27: Club by Club",
    category: "girls-football",
    primary: "girls academy trials 2026",
    secondary: ["arsenal girls academy trials", "chelsea girls academy", "leeds united girls academy", "crystal palace girls academy", "west ham girls academy trials", "aston villa girls academy", "fulham girls academy"],
    cluster: "Girls football: club academies",
    sv: 0,
    priority: "High",
    notes:
      "Proven by GSC: club girls' academy queries already land on the boys' dev-centre pages (Leeds 'girls academy' pos 8.4, Palace 7.2, Villa 4.8, West Ham 6.5-8.0, Arsenal 'girls academy trials 2026' 9.0) even though those pages are not written for them. Live SERP: club sites, Instagram, LinkedIn, Facebook. Alternative is a girls' section on each existing club page instead (changes to live pages, one-lever rules apply). Graham to choose; cannibalisation with those club pages to watch either way. Ads hides all volume.",
  },
  {
    path: "/football-gear/best-football-boots-for-girls",
    article: "Best Football Boots for Girls",
    category: "football-gear",
    primary: "girls football boots",
    secondary: ["best football boots for girls", "girls football boots size", "pink football boots girls"],
    cluster: "Girls football: gear",
    sv: 6600,
    priority: "High",
    notes:
      "Biggest measured commercial term in the girls' space: 6,600/mo, KD 0, Ads competition HIGH, peaks September. Gear research phase (SERP, Amazon range) still to run before writing. Cannibalisation check needed against /football-gear/best-football-boots-for-kids.",
  },
];

function main() {
  migrate();
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO pages (url, article, category, primary_keyword, secondary_keywords, cluster, status, total_target_sv, priority, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       article = excluded.article, category = excluded.category, primary_keyword = excluded.primary_keyword,
       secondary_keywords = excluded.secondary_keywords, cluster = excluded.cluster, status = 'planned',
       total_target_sv = excluded.total_target_sv, priority = excluded.priority, notes = excluded.notes,
       updated_at = excluded.updated_at`
  );
  const now = nowIso();
  for (const r of ROADMAP) {
    const url = `${SITE_URL}${r.path}`;
    upsert.run(url, r.article, r.category, r.primary, r.secondary.join("; "), r.cluster, r.sv, r.priority, `${RESEARCH_NOTE}. ${r.notes}`, now, now);
    console.log(`Added: ${url}  [${r.priority}]`);
  }
  console.log(`\n${ROADMAP.length} roadmap rows upserted (status='planned'). Tracker: ${exportArticleTracker("csv")}`);
}

main();
