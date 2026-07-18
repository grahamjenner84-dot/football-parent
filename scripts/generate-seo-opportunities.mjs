#!/usr/bin/env node
/**
 * Generate SEO opportunities + match each flagged page to its file in the repo.
 *
 * Run locally (not deployed - this is a CLI helper, not a route):
 *   node scripts/generate-seo-opportunities.mjs
 *
 * Requires the same env vars as the admin page:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *   GSC_SITE_URL
 * Loaded from .env.local automatically if present.
 *
 * Output:
 *   seo-opportunities.json  - structured, for Claude Code to read
 *   seo-opportunities.md    - human-readable, guardrails reminder up top
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JWT } from "google-auth-library";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
// This project's thin route pages live under app/ (App Router: folder = route
// segment, page.tsx = the page) - that's what CONTENT_DIR walks for route
// matching. The actual article body content is a separate content/<category>/
// <slug>.mdx tree, not a sibling of page.tsx - see the mdx lookup in
// buildRouteMap() below, which maps between the two by route segments rather
// than by directory adjacency.
const CONTENT_DIR = path.join(REPO_ROOT, "app");
const MDX_CONTENT_DIR = path.join(REPO_ROOT, "content");

// --- load .env.local manually (no extra dependency needed) ---------------
function loadEnvLocal() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

// --- GSC fetch (same logic as lib/gsc.ts, standalone here) ---------------
const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

const STRIKING_DISTANCE_MIN_POS = 11;
const STRIKING_DISTANCE_MAX_POS = 20;
const STRIKING_DISTANCE_MIN_IMPRESSIONS = 20;
const LOW_CTR_MIN_IMPRESSIONS = 50;
const DECAY_MIN_CLICK_DROP_PCT = 30;
// Decay gets its own, shorter current/prior window (see DECAY_CURRENT_PERIOD_DAYS
// below) rather than sharing the 90-day window used for striking distance/low
// CTR/cannibalisation - a 90-vs-90 comparison averages a real ranking drop
// across so much time that it's both slow to detect and, on a young site,
// often has no prior-period data to compare against at all. Raised from 5:
// a shorter window means fewer accumulated clicks per page, so the floor
// needs to stay meaningful in weekly-rate terms, not just raw count, to avoid
// flagging "decay" that's really just noise on a low-traffic page.
const DECAY_MIN_PRIOR_CLICKS = 8;
const CURRENT_PERIOD_DAYS = 90;
const COMPARE_PERIOD_DAYS = 90;
const DECAY_CURRENT_PERIOD_DAYS = 28;
const DECAY_COMPARE_PERIOD_DAYS = 28;
const RECENT_WINDOW_DAYS = 14; // window checked against the rest of the period for low-CTR re-verification
const RECENT_TREND_MIN_IMPRESSIONS = 15; // below this, recent CTR is too noisy to trust
const RECENT_IMPROVEMENT_THRESHOLD = 3; // positions of improvement needed to call it "recently improved"

// "Gone quiet" - pages with real impressions historically that have gone
// near-silent recently. Both windows below end at currentEnd, which is
// already 3 days behind today to skip GSC's normal reporting lag - so a
// page only needs investigating if it's quiet across this whole recent
// window, not just the last day or two of incomplete data.
const SILENCE_RECENT_DAYS = 7;
const SILENCE_BASELINE_DAYS = 21;
const SILENCE_MIN_BASELINE_IMPRESSIONS = 30; // needs to have been getting real traffic before
const SILENCE_MAX_RECENT_IMPRESSIONS = 2; // near-zero in the recent window to count as "quiet"

const EXPECTED_CTR_BY_POSITION = {
  1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
  6: 0.05, 7: 0.04, 8: 0.03, 9: 0.03, 10: 0.02,
};

function expectedCtr(position) {
  const pos = Math.max(1, Math.round(position));
  return EXPECTED_CTR_BY_POSITION[pos] ?? 0.01;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, days) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    console.error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
    );
    process.exit(1);
  }
  const key = rawKey.replace(/\\n/g, "\n");
  return new JWT({ email, key, scopes: SCOPES });
}

async function fetchRows(client, startDate, endDate, dimensions, filters = null) {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) {
    console.error("Missing GSC_SITE_URL");
    process.exit(1);
  }
  const rows = [];
  let startRow = 0;
  const rowLimit = 25000;
  const body = { startDate, endDate, dimensions, rowLimit, startRow };
  if (filters) body.dimensionFilterGroups = [{ filters }];
  while (true) {
    body.startRow = startRow;
    const res = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/searchAnalytics/query`,
      method: "POST",
      data: body,
    });
    const batch = res.data.rows || [];
    rows.push(...batch);
    if (batch.length < rowLimit) break;
    startRow += rowLimit;
  }
  return rows;
}

function analyseStrikingDistance(rows) {
  const results = [];
  for (const r of rows) {
    const [query, page] = r.keys;
    if (
      r.position >= STRIKING_DISTANCE_MIN_POS &&
      r.position <= STRIKING_DISTANCE_MAX_POS &&
      r.impressions >= STRIKING_DISTANCE_MIN_IMPRESSIONS
    ) {
      results.push({
        type: "striking_distance",
        query,
        page,
        position: Math.round(r.position * 10) / 10,
        impressions: r.impressions,
        clicks: r.clicks,
        ctr: Math.round(r.ctr * 1000) / 10,
      });
    }
  }
  return results.sort((a, b) => b.impressions - a.impressions);
}

function analyseLowCtr(rows) {
  const results = [];
  for (const r of rows) {
    const [page] = r.keys;
    if (r.impressions < LOW_CTR_MIN_IMPRESSIONS) continue;
    const expected = expectedCtr(r.position);
    if (r.ctr < expected * 0.6) {
      results.push({
        type: "low_ctr",
        page,
        position: Math.round(r.position * 10) / 10,
        impressions: r.impressions,
        clicks: r.clicks,
        actualCtr: Math.round(r.ctr * 1000) / 10,
        expectedCtr: Math.round(expected * 1000) / 10,
      });
    }
  }
  return results.sort((a, b) => b.impressions - a.impressions);
}

// A 90-day aggregate can badly mislead low-CTR detection: a page that's
// only recently started ranking well will show mostly-zero-click days from
// when it was buried on page 2-3, dragging the aggregate CTR down even
// though its *current* CTR at its *current* position might be fine. This
// re-checks each low-CTR candidate against a recent-only window before
// treating it as a real title/meta problem.

async function addRecentTrend(client, candidates, periodStart, periodEnd) {
  const recentStart = addDays(new Date(periodEnd), -(RECENT_WINDOW_DAYS - 1));

  for (const row of candidates) {
    const daily = await fetchRows(client, isoDate(periodStart), isoDate(periodEnd), ["date"], [
      { dimension: "page", operator: "equals", expression: row.page },
    ]);

    let recentImpr = 0, recentClicks = 0, recentPosWeighted = 0;
    let earlierImpr = 0, earlierClicks = 0, earlierPosWeighted = 0;

    for (const d of daily) {
      const [dateStr] = d.keys;
      const isRecent = new Date(dateStr) >= recentStart;
      if (isRecent) {
        recentImpr += d.impressions;
        recentClicks += d.clicks;
        recentPosWeighted += d.position * d.impressions;
      } else {
        earlierImpr += d.impressions;
        earlierClicks += d.clicks;
        earlierPosWeighted += d.position * d.impressions;
      }
    }

    const recentPosition = recentImpr ? recentPosWeighted / recentImpr : null;
    const earlierPosition = earlierImpr ? earlierPosWeighted / earlierImpr : null;
    const recentCtr = recentImpr ? recentClicks / recentImpr : null;

    row.recentTrend = {
      windowDays: RECENT_WINDOW_DAYS,
      recentImpressions: recentImpr,
      recentClicks: recentClicks,
      recentPosition: recentPosition !== null ? Math.round(recentPosition * 10) / 10 : null,
      recentCtr: recentCtr !== null ? Math.round(recentCtr * 1000) / 10 : null,
      earlierImpressions: earlierImpr,
      earlierPosition: earlierPosition !== null ? Math.round(earlierPosition * 10) / 10 : null,
    };

    if (recentImpr < RECENT_TREND_MIN_IMPRESSIONS) {
      row.status = "insufficient_recent_data";
    } else if (
      earlierPosition !== null &&
      recentPosition !== null &&
      earlierPosition - recentPosition >= RECENT_IMPROVEMENT_THRESHOLD &&
      recentCtr >= expectedCtr(recentPosition) * 0.6
    ) {
      // Position has meaningfully improved recently, and CTR at the new,
      // better position is actually fine - the aggregate flag was an
      // artifact of the old ranking, not a real title/meta problem.
      row.status = "resolved_by_recent_ranking_improvement";
    } else {
      row.status = "confirmed";
    }
  }

  return candidates;
}

function analyseDecay(currentRows, priorRows) {
  const priorMap = new Map(priorRows.map((r) => [r.keys[0], r]));
  const results = [];
  for (const r of currentRows) {
    const [page] = r.keys;
    const prior = priorMap.get(page);
    if (!prior || prior.clicks < DECAY_MIN_PRIOR_CLICKS) continue;
    const dropPct = ((prior.clicks - r.clicks) / prior.clicks) * 100;
    if (dropPct >= DECAY_MIN_CLICK_DROP_PCT) {
      results.push({
        type: "decay",
        page,
        priorClicks: prior.clicks,
        currentClicks: r.clicks,
        dropPct: Math.round(dropPct * 10) / 10,
        priorPosition: Math.round(prior.position * 10) / 10,
        currentPosition: Math.round(r.position * 10) / 10,
      });
    }
  }
  return results.sort((a, b) => b.dropPct - a.dropPct);
}

// A page going from real, steady impressions to near-zero is often more
// urgent than a gradual decay, deindexing, a robots/noindex slip, a broken
// canonical, a bad deploy - and easy to miss by eye across dozens of pages.
// Both windows here end at currentEnd (already lag-adjusted), so this only
// fires if the whole recent window is quiet, not just the last day or two
// of naturally incomplete data.
function analyseSilence(pageDateRows, currentEnd) {
  const recentStart = addDays(new Date(currentEnd), -(SILENCE_RECENT_DAYS - 1));
  const baselineEnd = addDays(recentStart, -1);
  const baselineStart = addDays(baselineEnd, -(SILENCE_BASELINE_DAYS - 1));

  const byPage = new Map();
  for (const r of pageDateRows) {
    const [page, dateStr] = r.keys;
    const date = new Date(dateStr);
    if (!byPage.has(page)) {
      byPage.set(page, { recentImpressions: 0, recentClicks: 0, baselineImpressions: 0, baselineClicks: 0 });
    }
    const entry = byPage.get(page);
    if (date >= recentStart && date <= new Date(currentEnd)) {
      entry.recentImpressions += r.impressions;
      entry.recentClicks += r.clicks;
    } else if (date >= baselineStart && date <= baselineEnd) {
      entry.baselineImpressions += r.impressions;
      entry.baselineClicks += r.clicks;
    }
  }

  const results = [];
  for (const [page, stats] of byPage) {
    if (
      stats.baselineImpressions >= SILENCE_MIN_BASELINE_IMPRESSIONS &&
      stats.recentImpressions <= SILENCE_MAX_RECENT_IMPRESSIONS
    ) {
      results.push({
        type: "silence",
        page,
        baselineImpressions: stats.baselineImpressions,
        baselineClicks: stats.baselineClicks,
        baselineDays: SILENCE_BASELINE_DAYS,
        recentImpressions: stats.recentImpressions,
        recentClicks: stats.recentClicks,
        recentDays: SILENCE_RECENT_DAYS,
      });
    }
  }

  return results.sort((a, b) => b.baselineImpressions - a.baselineImpressions);
}

// --- file matching ---------------------------------------------------------
// Walks CONTENT_DIR and builds a map of route path -> file path, following
// Next.js App Router conventions. Route groups like (marketing) are dropped
// from the URL; everything else maps folder structure 1:1 to the route.

function walkRoutes(dir, routePrefix, map) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name === "api" || entry.name === "admin") continue;
    if (entry.name.startsWith("_") || entry.name === "node_modules") continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const isRouteGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
      const isDynamic = entry.name.startsWith("[") && entry.name.endsWith("]");
      const segment = isRouteGroup ? "" : isDynamic ? null : entry.name;
      // Skip dynamic segments entirely - can't reliably match those to a GSC
      // URL without knowing the actual param value, so leave them unmapped.
      if (segment === null) continue;
      const nextPrefix = segment ? `${routePrefix}/${segment}` : routePrefix;
      walkRoutes(fullPath, nextPrefix, map);
    } else if (
      entry.name === "page.tsx" ||
      entry.name === "page.ts" ||
      entry.name === "page.jsx" ||
      entry.name === "page.js"
    ) {
      const route = routePrefix === "" ? "/" : routePrefix;
      map.set(route, path.relative(REPO_ROOT, fullPath));

      // Article content isn't a sibling of page.tsx in this project - it's a
      // separate content/<category>/<slug>.mdx tree (see CLAUDE.md). page.tsx
      // is a thin wrapper that calls getArticleBySlug(category, slug), so a
      // 2-segment route maps directly to content/<category>/<slug>.mdx.
      // Category index pages (1 segment) are hand-written with no .mdx.
      const segments = route.split("/").filter(Boolean);
      if (segments.length === 2) {
        const [category, slug] = segments;
        const mdxPath = path.join(MDX_CONTENT_DIR, category, `${slug}.mdx`);
        if (fs.existsSync(mdxPath)) {
          map.set(route + "::mdx", path.relative(REPO_ROOT, mdxPath));
        }
      }
    }
  }
}

function buildRouteMap() {
  const map = new Map();
  walkRoutes(CONTENT_DIR, "", map);
  return map;
}

function pathnameFromUrl(pageUrl) {
  try {
    return new URL(pageUrl).pathname.replace(/\/$/, "") || "/";
  } catch {
    return pageUrl;
  }
}

function matchFile(routeMap, pageUrl) {
  const pathname = pathnameFromUrl(pageUrl);
  const pageFile = routeMap.get(pathname);
  const mdxFile = routeMap.get(pathname + "::mdx");
  if (!pageFile) return { matched: false, pathname };
  return { matched: true, pathname, pageFile, mdxFile: mdxFile || null };
}

// --- current title/meta extraction -----------------------------------
// Best-effort only: pulls whatever it can find so a suggested rewrite has
// something concrete to compare against, rather than guessing. If nothing
// is found, that's reported explicitly rather than left blank/assumed.

function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*["']?(.*?)["']?\s*$/);
    if (m) fm[m[1]] = m[2];
  }
  return fm;
}

function extractMetaFromTsx(content) {
  // Looks for title/description inside an `export const metadata = {...}`
  // block or a `generateMetadata` return object. Simple regex, not a full
  // parser - won't catch every pattern, but flags what it can't find.
  const titleMatch = content.match(/title:\s*[`"']([^`"']+)[`"']/);
  const descMatch = content.match(/description:\s*[`"']([^`"']+)[`"']/);
  return {
    title: titleMatch ? titleMatch[1] : null,
    description: descMatch ? descMatch[1] : null,
  };
}

function getCurrentMeta(match) {
  let title = null;
  let description = null;
  let source = null;

  if (match.mdxFile) {
    const fullPath = path.join(REPO_ROOT, match.mdxFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const fm = extractFrontmatter(content);
      if (fm.title) { title = fm.title; source = match.mdxFile; }
      if (fm.description) { description = fm.description; source = match.mdxFile; }
    }
  }

  if ((!title || !description) && match.pageFile) {
    const fullPath = path.join(REPO_ROOT, match.pageFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const meta = extractMetaFromTsx(content);
      if (!title && meta.title) { title = meta.title; source = match.pageFile; }
      if (!description && meta.description) { description = meta.description; source = match.pageFile; }
    }
  }

  return {
    title,
    description,
    found: Boolean(title || description),
    source,
  };
}

// --- output -----------------------------------------------------------

const GUARDRAILS = `
## Before touching any of these pages

- One change at a time. Pick a single lever (title, one section, one internal
  link) per page per edit - not a combined rewrite. If something moves,
  ranking or CTR, you need to know which change did it.
- Commit before you edit, on its own commit, so a bad change is a single
  \`git revert\` away. Don't bundle an SEO tweak into an unrelated commit.
- Don't touch the URL/slug of a page that's already ranking or getting
  clicks, ever, unless that's explicitly the point of the change.
- Don't remove existing headings, internal links, or content sections.
  Additive and targeted beats restructuring.
- After publishing, that page goes on a watch list for 10-14 days before any
  further changes. If clicks or position drop, revert immediately rather
  than trying to fix forward.
- Pages with zero or near-zero current clicks (most striking_distance and
  cannibalisation entries) carry less risk since there's little to lose -
  low_ctr and decay entries on pages with real existing clicks carry more,
  treat those more conservatively.
`.trim();

function toMarkdown(opportunities, routeMap) {
  const lines = [];
  lines.push(`# SEO opportunities - ${new Date().toISOString().slice(0, 10)}\n`);
  lines.push(GUARDRAILS + "\n");

  for (const section of ["silence", "striking_distance", "low_ctr", "decay"]) {
    const rows = opportunities.filter((o) => o.type === section);
    if (!rows.length) continue;

    if (section === "silence") {
      lines.push(`## gone quiet\n`);
      lines.push(
        `Pages with real impressions historically that have gone near-silent in ` +
        `the last ${SILENCE_RECENT_DAYS} days. This is usually technical (deindexing, ` +
        `a noindex tag, a broken canonical, a bad deploy) rather than a content ` +
        `problem - **investigate via Search Console's URL Inspection / Test Live URL ` +
        `first, don't edit content as a first response.** Note: GSC data lags ` +
        `2-3 days, these windows already end before that lag, so a page shown here ` +
        `has been quiet for its whole recent window, not just the last day or two.\n`
      );
      for (const row of rows) {
        const match = matchFile(routeMap, row.page);
        lines.push(`- **${row.page}**`);
        lines.push(`  - last ${row.baselineDays}d before that: ${row.baselineImpressions} impressions, ${row.baselineClicks} clicks`);
        lines.push(`  - last ${row.recentDays}d: ${row.recentImpressions} impressions, ${row.recentClicks} clicks`);
        if (match.matched) {
          lines.push(`  - file: \`${match.pageFile}\``);
          if (match.mdxFile) lines.push(`  - content: \`${match.mdxFile}\``);
        } else {
          lines.push(`  - no file match found for path \`${match.pathname}\` - check manually`);
        }
      }
      lines.push("");
      continue;
    }

    if (section === "low_ctr") {
      const confirmed = rows.filter((r) => r.status === "confirmed");
      const resolved = rows.filter((r) => r.status === "resolved_by_recent_ranking_improvement");
      const insufficient = rows.filter((r) => r.status === "insufficient_recent_data");

      lines.push(`## low ctr\n`);
      lines.push(
        `Aggregate ${CURRENT_PERIOD_DAYS}-day CTR can be misleading for pages that only ` +
        `recently started ranking well, since old low-ranking days drag the average down. ` +
        `Each entry has been re-checked against the last ${RECENT_WINDOW_DAYS} days.\n`
      );

      if (confirmed.length) {
        lines.push(`### Confirmed - still a real gap on recent data\n`);
        for (const row of confirmed) lines.push(...renderLowCtrRow(row, routeMap));
      }
      if (resolved.length) {
        lines.push(`\n### Likely resolved - position improved recently, recent CTR is fine\n`);
        lines.push(`These triggered the aggregate check but look fine now. No action needed, listed for visibility only.\n`);
        for (const row of resolved) lines.push(...renderLowCtrRow(row, routeMap));
      }
      if (insufficient.length) {
        lines.push(`\n### Insufficient recent data - too few recent impressions to judge\n`);
        for (const row of insufficient) lines.push(...renderLowCtrRow(row, routeMap));
      }
      lines.push("");
      continue;
    }

    lines.push(`## ${section.replace("_", " ")}\n`);
    for (const row of rows) {
      const match = matchFile(routeMap, row.page);
      lines.push(`- **${row.page}**`);
      if (row.query) lines.push(`  - query: ${row.query}, position: ${row.position}`);
      if (row.impressions !== undefined) lines.push(`  - impressions: ${row.impressions}, clicks: ${row.clicks}`);
      if (row.dropPct !== undefined) lines.push(`  - clicks dropped ${row.dropPct}% (${row.priorClicks} -> ${row.currentClicks})`);
      if (match.matched) {
        lines.push(`  - file: \`${match.pageFile}\``);
        if (match.mdxFile) lines.push(`  - content: \`${match.mdxFile}\``);
      } else {
        lines.push(`  - no file match found for path \`${match.pathname}\` - check manually`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderLowCtrRow(row, routeMap) {
  const lines = [];
  const match = matchFile(routeMap, row.page);
  lines.push(`- **${row.page}**`);
  lines.push(`  - aggregate (${CURRENT_PERIOD_DAYS}d): position ${row.position}, ${row.impressions} impr, ${row.actualCtr}% CTR vs ${row.expectedCtr}% expected`);
  if (row.recentTrend) {
    const t = row.recentTrend;
    lines.push(
      `  - last ${t.windowDays}d: position ${t.recentPosition ?? "n/a"}, ${t.recentImpressions} impr, ${t.recentCtr ?? "n/a"}% CTR` +
      (t.earlierPosition !== null ? ` (was position ${t.earlierPosition} earlier in the period)` : "")
    );
  }
  if (match.matched) {
    lines.push(`  - file: \`${match.pageFile}\``);
    if (match.mdxFile) lines.push(`  - content: \`${match.mdxFile}\``);
    const meta = getCurrentMeta(match);
    if (meta.found) {
      if (meta.title) lines.push(`  - current title: "${meta.title}"`);
      if (meta.description) lines.push(`  - current meta description: "${meta.description}"`);
    } else {
      lines.push(`  - current title/meta: not found automatically, check \`${match.pageFile}\` manually`);
    }
  } else {
    lines.push(`  - no file match found for path \`${match.pathname}\` - check manually`);
  }
  return lines;
}

async function main() {
  const client = getClient();

  const today = new Date();
  const currentEnd = addDays(today, -3);
  const currentStart = addDays(currentEnd, -CURRENT_PERIOD_DAYS);
  const priorEnd = addDays(currentStart, -1);
  const priorStart = addDays(priorEnd, -COMPARE_PERIOD_DAYS);

  // Decay's own, shorter window - see the constant comments above.
  const decayCurrentStart = addDays(currentEnd, -DECAY_CURRENT_PERIOD_DAYS);
  const decayPriorEnd = addDays(decayCurrentStart, -1);
  const decayPriorStart = addDays(decayPriorEnd, -DECAY_COMPARE_PERIOD_DAYS);

  console.log("Fetching GSC data...");
  const [queryPageRows, pageRowsCurrent, decayRowsCurrent, decayRowsPrior, pageDateRows] = await Promise.all([
    fetchRows(client, isoDate(currentStart), isoDate(currentEnd), ["query", "page"]),
    fetchRows(client, isoDate(currentStart), isoDate(currentEnd), ["page"]),
    fetchRows(client, isoDate(decayCurrentStart), isoDate(currentEnd), ["page"]),
    fetchRows(client, isoDate(decayPriorStart), isoDate(decayPriorEnd), ["page"]),
    fetchRows(client, isoDate(addDays(currentEnd, -(SILENCE_RECENT_DAYS + SILENCE_BASELINE_DAYS - 1))), isoDate(currentEnd), ["page", "date"]),
  ]);

  const strikingDistance = analyseStrikingDistance(queryPageRows);
  const lowCtrCandidates = analyseLowCtr(pageRowsCurrent);
  const decay = analyseDecay(decayRowsCurrent, decayRowsPrior);
  const silence = analyseSilence(pageDateRows, currentEnd);

  console.log(`Re-checking ${lowCtrCandidates.length} low-CTR candidates against a recent window...`);
  await addRecentTrend(client, lowCtrCandidates, currentStart, currentEnd);

  const opportunities = [...strikingDistance, ...lowCtrCandidates, ...decay, ...silence];

  console.log("Scanning repo for matching files...");
  const routeMap = buildRouteMap();

  const matched = opportunities.map((row) => {
    const match = matchFile(routeMap, row.page);
    const withMeta = { ...row, match };
    if (row.type === "low_ctr" && match.matched) {
      withMeta.currentMeta = getCurrentMeta(match);
    }
    return withMeta;
  });

  fs.writeFileSync(
    path.join(REPO_ROOT, "seo-opportunities.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), guardrails: GUARDRAILS, opportunities: matched }, null, 2)
  );
  fs.writeFileSync(
    path.join(REPO_ROOT, "seo-opportunities.md"),
    toMarkdown(opportunities, routeMap)
  );

  const matchedCount = matched.filter((m) => m.match.matched).length;
  console.log(`\nDone.`);
  console.log(`  Gone quiet: ${silence.length}`);
  console.log(`  Striking distance: ${strikingDistance.length}`);
  console.log(`  Low CTR candidates: ${lowCtrCandidates.length}`);
  console.log(`  Decay: ${decay.length}`);
  console.log(`  Matched to a file: ${matchedCount} / ${opportunities.length}`);
  console.log(`\n  seo-opportunities.json and seo-opportunities.md written to repo root.`);
}

main();
