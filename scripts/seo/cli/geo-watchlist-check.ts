// Paid half of the GEO watchlist pair (see geo-watchlist-build.ts, which
// generates seo-data/exports/geo-watchlist.json for free from GSC). Checks
// AI Overview presence, our citation status and PAA questions for the
// watchlist keywords, and diffs each result against its own most recent
// prior check so you can see what changed rather than re-reading a flat
// snapshot every time.
//
// History persists to seo-data/exports/geo-watchlist-history.jsonl
// (append-only, one line per keyword per check) and mirrors into the
// existing ai-citation-log.csv in the same row shape ai-overview-check.ts
// already writes, so that file stays the single human-skimmable log.
//
// Usage (after explicit user approval in-session, per this repo's live-call
// convention - see CLAUDE.md):
//   npx tsx scripts/seo/cli/geo-watchlist-check.ts                  # dry run: shows the plan + cost estimate
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/geo-watchlist-check.ts # actually spends
//
// Options:
//   --limit N          cap how many keywords this run checks (default 40)
//   --bucket <name>     "best_performing" or "page_2_3" only
//   --recheck-days N    only re-check keywords last checked >= N days ago (default 13, matching the watch-window convention)
//   --force             ignore the recheck-days filter, check everything selected
import fs from "node:fs";
import path from "node:path";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, citationSummary, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");
const WATCHLIST_PATH = path.join(EXPORT_DIR, "geo-watchlist.json");
const HISTORY_PATH = path.join(EXPORT_DIR, "geo-watchlist-history.jsonl");
const REPORT_PATH = path.join(EXPORT_DIR, "geo-watchlist-report.md");
const CSV_LOG_PATH = path.join(REPO_ROOT, "ai-citation-log.csv");

type WatchlistEntry = {
  keyword: string;
  page: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  bucket: "best_performing" | "page_2_3";
};

type HistoryRecord = {
  date: string;
  keyword: string;
  bucket: string;
  ourGscPosition: number;
  ourGscImpressions: number;
  ourGscClicks: number;
  aioPresent: boolean;
  cited: boolean;
  citationPosition: number | null;
  competitorDomains: string[];
  paaQuestions: string[];
};

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function parseArgs(argv: string[]) {
  const getNum = (flag: string, fallback: number) => {
    const idx = argv.indexOf(flag);
    if (idx === -1 || !argv[idx + 1]) return fallback;
    const n = Number(argv[idx + 1]);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const getStr = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx === -1 ? undefined : argv[idx + 1];
  };
  return {
    limit: getNum("--limit", 40),
    bucket: getStr("--bucket") as "best_performing" | "page_2_3" | undefined,
    recheckDays: getNum("--recheck-days", 13),
    force: argv.includes("--force"),
  };
}

function readHistory(): HistoryRecord[] {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  return fs
    .readFileSync(HISTORY_PATH, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as HistoryRecord);
}

function lastCheckFor(history: HistoryRecord[], keyword: string): HistoryRecord | undefined {
  const matches = history.filter((h) => h.keyword === keyword).sort((a, b) => (a.date < b.date ? 1 : -1));
  return matches[0];
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function diffStatus(prior: HistoryRecord | undefined, current: { aioPresent: boolean; cited: boolean }): string {
  if (!prior) return current.aioPresent ? (current.cited ? "first check - cited" : "first check - gap") : "first check - no AIO";
  if (!prior.aioPresent && current.aioPresent) return current.cited ? "AIO appeared - cited" : "AIO appeared - gap";
  if (prior.aioPresent && !current.aioPresent) return "AIO disappeared";
  if (!prior.cited && current.cited) return "NEWLY CITED";
  if (prior.cited && !current.cited) return "LOST CITATION";
  if (prior.cited && current.cited) return "still cited";
  if (!current.aioPresent) return "still no AIO";
  return "still a gap";
}

async function main() {
  const { limit, bucket, recheckDays, force } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(WATCHLIST_PATH)) {
    console.error(`No watchlist found at ${WATCHLIST_PATH}. Run geo-watchlist-build.ts first.`);
    process.exitCode = 1;
    return;
  }

  const watchlist = JSON.parse(fs.readFileSync(WATCHLIST_PATH, "utf8")) as { entries: WatchlistEntry[] };
  const history = readHistory();

  let candidates = watchlist.entries;
  if (bucket) candidates = candidates.filter((e) => e.bucket === bucket);

  if (!force) {
    candidates = candidates.filter((e) => {
      const last = lastCheckFor(history, e.keyword);
      return !last || daysSince(last.date) >= recheckDays;
    });
  }

  // Prioritise: never-checked first, then longest-since-checked, then by impressions.
  candidates.sort((a, b) => {
    const lastA = lastCheckFor(history, a.keyword);
    const lastB = lastCheckFor(history, b.keyword);
    if (!lastA && lastB) return -1;
    if (lastA && !lastB) return 1;
    if (lastA && lastB && lastA.date !== lastB.date) return lastA.date < lastB.date ? -1 : 1;
    return b.impressions - a.impressions;
  });

  candidates = candidates.slice(0, limit);

  if (candidates.length === 0) {
    console.log("Nothing to check - every candidate keyword was checked within the recheck window. Pass --force to override.");
    return;
  }

  const estimatedCost = candidates.length * 0.004;
  console.log(`${candidates.length} keyword(s) selected, estimated ~$${estimatedCost.toFixed(3)}`);
  candidates.forEach((c) => console.log(`  - "${c.keyword}" (${c.bucket}, our pos ${c.position}, ${c.impressions} impr)`));

  const liveReady = process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("\nDry run only - requires LIVE_CONFIRM=yes to actually spend.");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const csvRows: string[] = [];
  const newHistoryLines: string[] = [];
  const reportLines: string[] = [
    `# GEO watchlist check - ${today}`,
    "",
    `${candidates.length} keyword(s) checked.`,
    "",
    "| Keyword | Bucket | Our pos | AIO | Cited | Status | Other sources |",
    "|---|---|---|---|---|---|---|",
  ];
  let totalCost = 0;

  for (const entry of candidates) {
    const result = await googleOrganicSerp(entry.keyword, {
      workflow: "geo-watchlist-check",
      environment: "live",
      confirmLive: true,
      depth: 20,
    });
    totalCost += result.cost ?? 0;

    if (result.error || !result.data) {
      console.log(`ERROR "${entry.keyword}": ${result.error}`);
      continue;
    }

    const items = ((result.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
    const { aiOverview, paaQuestions, paaExpandedOverviews } = extractSerpFeatures(items);

    const aioPresent = !!aiOverview;
    const { cited, position, competitorDomains } = aioPresent
      ? citationSummary(aiOverview!.references)
      : { cited: false, position: null, competitorDomains: [] as string[] };

    const prior = lastCheckFor(history, entry.keyword);
    const status = diffStatus(prior, { aioPresent, cited });

    console.log(`\n=== "${entry.keyword}" (${entry.bucket}, our pos ${entry.position}) ===`);
    console.log(`AI Overview: ${aioPresent ? `present, cited: ${cited ? `YES (#${position})` : "no"}` : "not present"}`);
    console.log(`Status vs last check: ${status}`);
    if (competitorDomains.length) console.log(`Other sources: ${competitorDomains.slice(0, 5).join(", ")}`);

    reportLines.push(
      `| ${entry.keyword} | ${entry.bucket} | ${entry.position} | ${aioPresent ? "yes" : "no"} | ${cited ? `yes (#${position})` : "no"} | ${status} | ${competitorDomains.slice(0, 3).join(", ")} |`
    );

    const record: HistoryRecord = {
      date: today,
      keyword: entry.keyword,
      bucket: entry.bucket,
      ourGscPosition: entry.position,
      ourGscImpressions: entry.impressions,
      ourGscClicks: entry.clicks,
      aioPresent,
      cited,
      citationPosition: position,
      competitorDomains,
      paaQuestions,
    };
    newHistoryLines.push(JSON.stringify(record));

    if (aioPresent) {
      csvRows.push(
        [today, "Google AI Overview (DataForSEO)", entry.keyword, cited ? "Y" : "N", position ?? "", competitorDomains.slice(0, 5).join("; "), `geo-watchlist (${entry.bucket})`]
          .map((v) => csvEscape(String(v)))
          .join(",")
      );
    } else {
      csvRows.push(
        [today, "Google AI Overview (DataForSEO)", entry.keyword, "N", "", "", `geo-watchlist (${entry.bucket}) - no AI Overview on this SERP`]
          .map((v) => csvEscape(String(v)))
          .join(",")
      );
    }

    for (const { question, item } of paaExpandedOverviews) {
      const paaCitation = citationSummary(item.references);
      csvRows.push(
        [today, "Google PAA AI Overview (DataForSEO)", question, paaCitation.cited ? "Y" : "N", paaCitation.position ?? "", paaCitation.competitorDomains.slice(0, 5).join("; "), `geo-watchlist (${entry.bucket})`]
          .map((v) => csvEscape(String(v)))
          .join(",")
      );
    }
  }

  fs.appendFileSync(CSV_LOG_PATH, csvRows.join("\n") + "\n");
  fs.appendFileSync(HISTORY_PATH, newHistoryLines.join("\n") + "\n");

  const notable = reportLines
    .slice(6)
    .filter((line) => /NEWLY CITED|LOST CITATION|AIO appeared|AIO disappeared/.test(line));
  if (notable.length) {
    reportLines.push("", "## Notable changes", "", ...notable.map((l) => `- ${l}`));
  }

  fs.writeFileSync(REPORT_PATH, reportLines.join("\n") + "\n");

  console.log(`\nAppended ${csvRows.length} row(s) to ${CSV_LOG_PATH}`);
  console.log(`Appended ${newHistoryLines.length} record(s) to ${HISTORY_PATH}`);
  console.log(`Report written to ${REPORT_PATH}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
