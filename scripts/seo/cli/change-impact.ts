// Before/after read for SEO changes logged in seo-changes-*.md. Free: GSC
// (service account) and our own page_views table, no DataForSEO.
//
// Usage:
//   npx tsx scripts/seo/cli/change-impact.ts --change /football-gear/x=2026-10-13 [--change /y=2026-10-14] [--days 14]
//
// For each change (page path + the date the change went live):
// - Search Console: the days after the change (from the day after, up to
//   N days, ending 3 days before today because GSC lags) against the same
//   number of days immediately before it. Page totals, a same-query
//   position (queries present in both windows, equal weights both sides, so
//   a change in query mix can't fake a move), the biggest query movers, and
//   the whole site over the same windows as a control for seasonality.
// - Page views: genuine 7- and 14-day windows either side (our tracking has
//   no lag; ends yesterday), all sources and organic search only (Google
//   Ads clicks, which carry a gclid, are split out), with the site-wide
//   total as a control.
// - Any other commits touching the page's files since the pre window began,
//   which would muddy the read.
//
// The change day itself is excluded from both sides: it is partly before
// and partly after. Pass --days to widen the GSC window (default 14).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";
import { comparePageQueries, getPeriodTotals, pageUrl, type PageQueryMover, type PeriodTotals } from "../../../lib/gsc";
import { routes } from "../../../lib/routes";
import { getPageViewSourceDaysForPath, getPageViewStats, type PageViewSourceDay } from "../../../lib/supabase/page-views";

ensureEnvLoaded();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000);
}

function pct(after: number, before: number): string {
  if (!before) return after ? "new" : "0";
  const p = ((after - before) / before) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(0)}%`;
}

function pos(n: number | null): string {
  return n === null ? "-" : n.toFixed(1);
}

function parseArgs(argv: string[]): { changes: { path: string; date: string }[]; days: number } {
  const changes: { path: string; date: string }[] = [];
  let days = 14;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--change") {
      // Git Bash rewrites a leading-slash argument into a Windows path
      // (C:/Program Files/Git/...); undo that rather than relying on
      // MSYS_NO_PATHCONV being set.
      const raw = argv[++i].replace(/^[A-Za-z]:\/Program Files\/Git/, "");
      const eq = raw.lastIndexOf("=");
      const p = raw.slice(0, eq).replace(/^https?:\/\/[^/]+/, "");
      const date = raw.slice(eq + 1);
      if (eq === -1 || !p.startsWith("/") || !DATE_RE.test(date)) {
        throw new Error(`--change must be /path=YYYY-MM-DD, got "${raw}"`);
      }
      changes.push({ path: p, date });
    } else if (argv[i] === "--days") {
      days = Number(argv[++i]);
    }
  }
  if (!changes.length) throw new Error("Pass at least one --change /path=YYYY-MM-DD");
  const known = new Set<string>(routes);
  const unknown = changes.filter((c) => !known.has(c.path)).map((c) => c.path);
  if (unknown.length) throw new Error(`Not in lib/routes.ts (check the slug): ${unknown.join(", ")}`);
  return { changes, days };
}

function sameQueryPositions(movers: PageQueryMover[]): { after: number | null; before: number | null; queries: number } {
  let w = 0;
  let a = 0;
  let b = 0;
  let n = 0;
  for (const m of movers) {
    if (m.positionA === null || m.positionB === null) continue;
    const weight = Math.min(m.impressionsA, m.impressionsB);
    if (!weight) continue;
    w += weight;
    a += m.positionA * weight;
    b += m.positionB * weight;
    n++;
  }
  return { after: w ? a / w : null, before: w ? b / w : null, queries: n };
}

function sumWindow(days: { date: string; total: number; search: number; paid: number }[], start: string, end: string) {
  let total = 0;
  let search = 0;
  let paid = 0;
  for (const d of days) {
    if (d.date >= start && d.date <= end) {
      total += d.total;
      search += d.search;
      paid += d.paid;
    }
  }
  return { total, search, paid };
}

function relatedCommits(pagePath: string, since: string): string[] {
  const files = [path.join("content", `${pagePath}.mdx`), path.join("app", pagePath, "page.tsx")].filter((f) =>
    fs.existsSync(path.join(REPO_ROOT, f))
  );
  if (!files.length) return [];
  const out = execFileSync("git", ["log", `--since=${since}`, "--format=%h %ad %s", "--date=short", "--", ...files], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

async function main() {
  const { changes, days } = parseArgs(process.argv.slice(2));
  const today = new Date().toISOString().slice(0, 10);
  const gscLast = addDays(today, -3);
  const pvLast = addDays(today, -1);

  // One site-wide page-view pull covering every change's 14-day pre window.
  const earliest = changes.map((c) => c.date).sort()[0];
  const siteSpan = daysBetween(addDays(earliest, -14), today) + 1;
  const siteStats = await getPageViewStats(siteSpan);
  // getPageViewStats already files gclid rows under "Ads", so "Search" here
  // is organic, matching the per-page split.
  const siteDays = siteStats.byDay.map((d) => ({
    date: d.date,
    total: d.count,
    search: d.sourceGroups.find((g) => g.group === "Search")?.count ?? 0,
    paid: d.sourceGroups.find((g) => g.group === "Ads")?.count ?? 0,
  }));

  const siteGscCache = new Map<string, PeriodTotals>();
  const siteGsc = async (s: string, e: string) => {
    const key = `${s}..${e}`;
    if (!siteGscCache.has(key)) siteGscCache.set(key, await getPeriodTotals(s, e));
    return siteGscCache.get(key)!;
  };

  console.log(`# Change impact, run ${today}\n`);
  console.log(`GSC windows end ${gscLast} (3-day reporting lag). Page-view windows end ${pvLast}. Change day excluded from both sides.\n`);

  for (const { path: p, date } of changes) {
    console.log(`## ${p} (changed ${date})\n`);

    // --- Search Console
    const postStart = addDays(date, 1);
    const postEnd = [addDays(date, days), gscLast].sort()[0];
    const len = daysBetween(postStart, postEnd) + 1;
    if (len < 3) {
      console.log(`**Search Console:** too early, only ${Math.max(len, 0)} day(s) of post-change data clear of the lag. Read after ${addDays(date, 6)}.\n`);
    } else {
      const preEnd = addDays(date, -1);
      const preStart = addDays(date, -len);
      const [after, before, movers, siteAfter, siteBefore] = await Promise.all([
        getPeriodTotals(postStart, postEnd, p),
        getPeriodTotals(preStart, preEnd, p),
        comparePageQueries(pageUrl(p), postStart, postEnd, preStart, preEnd),
        siteGsc(postStart, postEnd),
        siteGsc(preStart, preEnd),
      ]);
      const same = sameQueryPositions(movers);
      console.log(`**Search Console, ${len} days each side:** before ${preStart} to ${preEnd}, after ${postStart} to ${postEnd}${len < days ? ` (short of the ${days}-day target, read again later)` : ""}\n`);
      console.log(`| | Before | After | Change | Site change |`);
      console.log(`|---|---|---|---|---|`);
      console.log(`| Impressions | ${before.impressions} | ${after.impressions} | ${pct(after.impressions, before.impressions)} | ${pct(siteAfter.impressions, siteBefore.impressions)} |`);
      console.log(`| Clicks | ${before.clicks} | ${after.clicks} | ${pct(after.clicks, before.clicks)} | ${pct(siteAfter.clicks, siteBefore.clicks)} |`);
      console.log(`| CTR | ${(before.ctr * 100).toFixed(2)}% | ${(after.ctr * 100).toFixed(2)}% | | ${(siteBefore.ctr * 100).toFixed(2)}% to ${(siteAfter.ctr * 100).toFixed(2)}% |`);
      console.log(`| Avg position (blended) | ${pos(before.avgPosition)} | ${pos(after.avgPosition)} | | |`);
      console.log(`| Same-query position (${same.queries} queries) | ${pos(same.before)} | ${pos(same.after)} | ${same.before !== null && same.after !== null ? (same.before - same.after >= 0 ? "+" : "") + (same.before - same.after).toFixed(1) + " (positive = better)" : ""} | |\n`);

      const top = movers.slice(0, 12);
      if (top.length) {
        console.log(`Top queries by impressions (position before → after, impressions before → after):\n`);
        for (const m of top) {
          console.log(`- "${m.query}": ${pos(m.positionB)} → ${pos(m.positionA)}, ${m.impressionsB} → ${m.impressionsA} impr, ${m.clicksB} → ${m.clicksA} clicks [${m.direction}]`);
        }
        const fresh = movers.filter((m) => m.direction === "new" && m.impressionsA >= 5).slice(0, 8);
        if (fresh.length) {
          console.log(`\nNewly ranking since the change (5+ impressions): ${fresh.map((m) => `"${m.query}" ${pos(m.positionA)} (${m.impressionsA})`).join(", ")}`);
        }
        console.log("");
      }
    }

    // --- Page views
    const pvDays: PageViewSourceDay[] = await getPageViewSourceDaysForPath(p, addDays(date, -14));
    console.log(`**Page views (first-party, no lag):**\n`);
    console.log(`| Window | Before (all / organic search) | After (all / organic search) | Change all / organic | Site change all / organic |`);
    console.log(`|---|---|---|---|---|`);
    let paid14 = { before: 0, after: 0 };
    for (const w of [7, 14]) {
      const aEnd = [addDays(date, w), pvLast].sort()[0];
      const wl = daysBetween(addDays(date, 1), aEnd) + 1;
      if (wl < 1) {
        console.log(`| ${w} days | | | no post-change days yet | |`);
        continue;
      }
      const b = sumWindow(pvDays, addDays(date, -wl), addDays(date, -1));
      const a = sumWindow(pvDays, addDays(date, 1), aEnd);
      const sb = sumWindow(siteDays, addDays(date, -wl), addDays(date, -1));
      const sa = sumWindow(siteDays, addDays(date, 1), aEnd);
      const label = wl < w ? `${w} days (only ${wl} so far)` : `${w} days`;
      console.log(`| ${label} | ${b.total} / ${b.search} | ${a.total} / ${a.search} | ${pct(a.total, b.total)} / ${pct(a.search, b.search)} | ${pct(sa.total, sb.total)} / ${pct(sa.search, sb.search)} |`);
      if (w === 14) paid14 = { before: b.paid, after: a.paid };
    }
    console.log("");
    if (paid14.before || paid14.after) {
      console.log(`Google Ads clicks (gclid) in the 14-day windows: ${paid14.before} before, ${paid14.after} after. Counted in "all", not in organic.\n`);
    }

    const commits = relatedCommits(p, addDays(date, -14));
    if (commits.length > 1) {
      console.log(`**Other commits on this page's files since ${addDays(date, -14)}** (more than one change in the window muddies the read):\n`);
      for (const c of commits) console.log(`- ${c}`);
      console.log("");
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
