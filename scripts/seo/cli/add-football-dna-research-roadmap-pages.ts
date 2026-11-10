// Adds the article ideas from the Football DNA review keyword research
// (seo-data/research/football-dna-keywords-2026-11-10.md, section 5.8) to the
// article roadmap (pages table, status='planned'), then re-exports
// seo-data/exports/article-tracker.csv. Local DB only, no API calls.
//
// Run: npx tsx scripts/seo/cli/add-football-dna-research-roadmap-pages.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { exportArticleTracker } from "../exports/article-tracker";

type Planned = {
  url: string;
  article: string;
  category: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  cluster: string;
  totalTargetSv: number;
  priority: "High" | "Medium" | "Low";
  notes: string;
};

const SOURCE = "Football DNA review keyword research 10 Nov 2026 (seo-data/research/football-dna-keywords-2026-11-10.md, 5.8).";

const PAGES: Planned[] = [
  {
    url: "https://www.footballparent.co.uk/coaching/playing-out-from-the-back-drills",
    article: "Playing Out From the Back Drills for 5v5 and 7v7",
    category: "coaching",
    primaryKeyword: "playing out from the back drills",
    secondaryKeywords: [
      "playing out from the back drills pdf",
      "playing out from the back 9v9 drills",
      "playing out from the back drills u10",
      "playing out from the back soccer drills",
      "what is playing out from the back",
      "advantages of playing out from the back",
    ],
    cluster: "Coaching: session themes",
    totalTargetSv: 190,
    priority: "High",
    notes:
      `${SOURCE} Keyword Planner UK: 'playing out from the back drills' 140/mo (260 Sep and Oct, 210 Jan), KD 0, no ad bids; pdf / 9v9 / u10 / soccer variants 10 each. ` +
      "SERP 10 Nov: drill libraries (sportsessionplanner, FIFA Training Centre, grassrootsfootballuk, themastermindsite), YouTube (7 video results), footballdna.co.uk #8 desktop / #6 mobile. " +
      "The AI Overview gives an 11v11 build-up (#2 and #3 split, #6, #8, #9), which is wrong for children's formats. Gap: 5v5 (goal-kick retreat line to halfway) and 7v7 (retreat line), U7 to U11. " +
      "Mobile PAA for H2s: 'What are the advantages of playing out from the back?', 'What is playing out from the back in soccer?'. " +
      "First-hand angle: Graham's U8 team struggled to play out; the Football DNA review's U8 section has the story. Diagrams needed. " +
      "Links: from the review's 'Using It for a Real Problem' section and the formations guide's 7v7 section. Cannibalisation: keep 'drills' phrasing out of the review's H2. Publish before the January peak.",
  },
  {
    url: "https://www.footballparent.co.uk/coaching/football-session-plan-template",
    article: "Football Session Plan Template (Free) and Session Plans by Age",
    category: "coaching",
    primaryKeyword: "football session plans",
    secondaryKeywords: [
      "fa session plan",
      "football training session plan",
      "football coaching session plan",
      "football session plans pdf",
      "football session plan template",
      "football session plans free",
      "grassroots football session plans",
    ],
    cluster: "Coaching: session planning",
    totalTargetSv: 750,
    priority: "Medium",
    notes:
      `${SOURCE} Keyword Planner UK: 'football session plans' 590/mo (880 Nov and Jan), KD 13, ad competition MEDIUM (66); 'fa session plan' returns identical figures (same cluster, not added twice); ` +
      "'football training session plan' 90 (KD 0); 'football coaching session plan' 70 (KD 0). Related searches are all pdf / template / free / Word: the intent is a downloadable plan. " +
      "SERP 10 Nov: England Football Learning #1, FA Level 2 Session Planner, sportplan, sportsessionplanner, Scottish FA, FIFA Training Centre, footballdna.co.uk (#2 mobile, #9 desktop); " +
      "one small app (pembee.app, 'Free Templates by Age') at #10 mobile, so a useful template can get in. " +
      "A new page type, not an article: a free template (PDF and Word) plus a few complete plans for U7 to U10. Needs some links, as the governing bodies hold the top 3. " +
      "Could also pick up 'football training sessions' (210, KD 14) and 'football coaching sessions' (90, KD 0) as secondary terms. Don't target these from the Football DNA review.",
  },
  {
    url: "https://www.footballparent.co.uk/coaching/1v1-football-drills-for-kids",
    article: "1v1 Football Drills for Kids",
    category: "coaching",
    primaryKeyword: "1v1 soccer drills",
    secondaryKeywords: ["1v1 football drills", "childrens football training drills", "2v1 soccer drills", "soccer drills one on one"],
    cluster: "Coaching: session themes",
    totalTargetSv: 420,
    priority: "Low",
    notes:
      `${SOURCE} Candidate only, SERPs not checked. Keyword Planner UK: '1v1 soccer drills' 210/mo (KD 0, US phrasing), 'childrens football training drills' 140 (KD 0, ad competition HIGH), ` +
      "'2v1 soccer drills' 50, 'soccer drills one on one' 20. Before planning: pull the UK SERP, check the UK 'football' phrasing volume, and check overlap with " +
      "/coaching/football-drills-for-7-and-8-year-olds, which already has a '1v1 Games That Build Close Control' section and ranks for 7 and 8 year old drill searches.",
  },
];

function main() {
  migrate();
  const db = getDb();
  const now = nowIso();
  const upsert = db.prepare(
    `INSERT INTO pages (url, article, category, primary_keyword, secondary_keywords, cluster, status, total_target_sv, priority, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       article = excluded.article, category = excluded.category, primary_keyword = excluded.primary_keyword,
       secondary_keywords = excluded.secondary_keywords, cluster = excluded.cluster, status = 'planned',
       total_target_sv = excluded.total_target_sv, priority = excluded.priority, notes = excluded.notes,
       updated_at = excluded.updated_at`
  );
  for (const p of PAGES) {
    upsert.run(p.url, p.article, p.category, p.primaryKeyword, p.secondaryKeywords.join("; "), p.cluster, p.totalTargetSv, p.priority, p.notes, now, now);
    console.log(`Added: ${p.url}  [${p.priority}]`);
  }
  console.log(`Tracker: ${exportArticleTracker("csv")}`);
}

main();
