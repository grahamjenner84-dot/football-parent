// Live UK rank check for every Coach App funnel page (the /coaching articles,
// the calculator and the landing page): where we actually sit on desktop and
// mobile for each page's original target keywords and its top GSC queries,
// whether the AI Overview cites us, how many page-one slots are app store
// listings, and whether the Coach App's Google Play listing ranks itself.
// GSC's position is an impression-weighted average across devices and
// personalised results, so this is the cross-check when it looks off.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-funnel-rank-check.ts
import fs from "node:fs";
import path from "node:path";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, citationSummary, isOurDomain, type SerpItem } from "../dataforseo/serp-features";
import { REPO_ROOT } from "../shared/env";

const PLAY_PACKAGE = "uk.co.footballparent.coachapp";
const DEPTH = 30;

const PAGES: Record<string, string[]> = {
  "/coaching/best-grassroots-football-apps": [
    "best football coaching app",
    "best football coaching apps",
    "football coaching app",
    "football coaching apps",
    "football coach app",
    "football coach apps",
    "apps for football coaches",
    "best apps for football coaches",
    "best football coach app",
    "free football coaching app",
    "grassroots football app",
    "football team management app",
    "best football team management app",
    "football management app",
  ],
  "/football-parent-coach-app (and Play listing)": [
    "grassroots football coach app",
    "football coach app android",
    "football team selector app",
    "football lineup app",
    "football substitution app",
    "equal game time app",
    "football coaching app no download",
  ],
  "/coaching/equal-playing-time-in-grassroots-football": [
    "equal playing time football",
    "equal game time",
    "equal playing time",
    "equal game time football",
    "fair game time football",
    "rolling substitutions football",
    "youth football substitution rules",
  ],
  "/coaching/equal-playing-time-calculator": [
    "playing time calculator",
    "equal playing time calculator",
    "equal game time calculator",
    "fair game time calculator",
    "playing time calculator football",
  ],
  "/coaching/football-drills-for-7-and-8-year-olds": [
    "football drills for 7 year olds",
    "football drills for 8 year olds",
    "football skills for 7 year olds",
    "ball mastery drills for kids",
    "football training for 7 year olds",
  ],
  "/coaching/what-qualifications-do-i-need-to-be-a-football-coach": [
    "what qualifications do you need to be a football coach",
    "fa level 1 coaching football",
    "how to become a grassroots football coach",
    "how to become a football coach",
    "level 1 football coach",
  ],
  "/coaching/best-football-formations-by-age-group": [
    "7 a side football formation",
    "9 a side football formation",
    "best formation for 7-a-side football",
    "9v9 football formations",
    "under 10 football rules",
    "under 9 football rules",
    "best football formations for youth teams",
  ],
  "/coaching/football-team-spreadsheet": [
    "football team spreadsheet",
    "soccer team spreadsheet",
    "football team spreadsheet template",
    "team stats",
    "apps for football stats",
  ],
  "/coaching": ["grassroots football coaching", "grassroots coaching"],
};

const STORE_DOMAINS = ["apps.apple.com", "play.google.com"];

type Row = {
  page: string;
  keyword: string;
  device: "desktop" | "mobile";
  ourRank: number | null;
  ourUrl: string | null;
  aio: boolean;
  aioCited: number | null;
  storeInTop10: number;
  playListingRank: number | null;
  top3: string[];
};

async function main() {
  const jobs = Object.entries(PAGES).flatMap(([page, kws]) =>
    kws.flatMap((keyword) => (["desktop", "mobile"] as const).map((device) => ({ page, keyword, device })))
  );
  console.log(`${jobs.length} SERP(s) at depth ${DEPTH}, estimated ~$${(jobs.length * 0.006).toFixed(2)}`);
  if (process.env.LIVE_CONFIRM !== "yes") {
    console.log("Not sending - requires LIVE_CONFIRM=yes for this invocation.");
    return;
  }

  const rows: Row[] = [];
  let cost = 0;
  for (const { page, keyword, device } of jobs) {
    const result = await googleOrganicSerp(keyword, {
      workflow: "coach-funnel-rank-check",
      environment: "live",
      confirmLive: true,
      device,
      depth: DEPTH,
    });
    cost += result.cost ?? 0;
    if (result.error || !result.data) {
      console.log(`ERROR "${keyword}" (${device}): ${result.error}`);
      continue;
    }
    const items = ((result.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
    const organic = items.filter((i) => i.type === "organic") as Array<SerpItem & { rank_group?: number; url?: string; domain?: string }>;
    const ours = organic.find((i) => isOurDomain(i.url));
    const play = organic.find((i) => (i.url ?? "").includes(PLAY_PACKAGE));
    const { aiOverview } = extractSerpFeatures(items);
    const cite = aiOverview ? citationSummary(aiOverview.references) : null;
    rows.push({
      page,
      keyword,
      device,
      ourRank: ours?.rank_group ?? null,
      ourUrl: ours?.url ?? null,
      aio: !!aiOverview,
      aioCited: cite?.cited ? cite.position ?? null : null,
      storeInTop10: organic.filter((i) => (i.rank_group ?? 99) <= 10 && STORE_DOMAINS.includes(i.domain ?? "")).length,
      playListingRank: play?.rank_group ?? null,
      top3: organic.slice(0, 3).map((i) => i.domain ?? ""),
    });
    process.stdout.write(".");
  }

  const today = new Date().toISOString().slice(0, 10);
  const out = path.join(REPO_ROOT, "seo-data", "exports", `coach-funnel-rank-check-${today}.json`);
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  console.log(`\nWrote ${rows.length} rows to ${out}. Cost $${cost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
