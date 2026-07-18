#!/usr/bin/env node
/**
 * Pull full Search Console history for a single page so Claude Code can
 * answer "why is this page doing X" questions with real data instead of
 * guessing.
 *
 * Run locally:
 *   node scripts/inspect-page.mjs /academy-pathway/how-much-does-academy-football-cost
 *
 * Requires the same env vars as the admin page, loaded from .env.local:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *   GSC_SITE_URL
 *
 * Prints a markdown report to stdout - month-by-month position/clicks/
 * impressions trend, top queries currently driving the page, a 28-vs-28-day
 * trend verdict, and the matched page.tsx/content .mdx files with current
 * title/meta - so a conversation about this page can start from facts.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JWT } from "google-auth-library";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(REPO_ROOT, "app");
const MDX_CONTENT_DIR = path.join(REPO_ROOT, "content");

const HISTORY_DAYS = 180; // trend window - long enough to see a real pattern, not just noise
const TREND_WINDOW_DAYS = 28; // matches the decay window used elsewhere for consistency

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

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

function getClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    console.error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    process.exit(1);
  }
  const key = rawKey.replace(/\\n/g, "\n");
  return new JWT({ email, key, scopes: SCOPES });
}

async function fetchRows(client, startDate, endDate, dimensions, pagePath) {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) {
    console.error("Missing GSC_SITE_URL");
    process.exit(1);
  }
  const rows = [];
  let startRow = 0;
  const rowLimit = 25000;
  const body = {
    startDate,
    endDate,
    dimensions,
    rowLimit,
    dimensionFilterGroups: [
      { filters: [{ dimension: "page", operator: "equals", expression: pagePath }] },
    ],
  };
  while (true) {
    body.startRow = startRow;
    const res = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
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

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, days) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// --- file matching (same convention as generate-seo-opportunities.mjs) ----

function findFiles(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const appDir = path.join(CONTENT_DIR, ...segments);
  const candidates = ["page.tsx", "page.ts", "page.jsx", "page.js"];
  let pageFile = null;
  for (const c of candidates) {
    const p = path.join(appDir, c);
    if (fs.existsSync(p)) { pageFile = path.relative(REPO_ROOT, p); break; }
  }
  let mdxFile = null;
  if (segments.length === 2) {
    const [category, slug] = segments;
    const p = path.join(MDX_CONTENT_DIR, category, `${slug}.mdx`);
    if (fs.existsSync(p)) mdxFile = path.relative(REPO_ROOT, p);
  }
  return { pageFile, mdxFile };
}

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
  const titleMatch = content.match(/title:\s*[`"']([^`"']+)[`"']/);
  const descMatch = content.match(/description:\s*[`"']([^`"']+)[`"']/);
  return { title: titleMatch ? titleMatch[1] : null, description: descMatch ? descMatch[1] : null };
}

function getCurrentMeta(files) {
  let title = null, description = null;
  if (files.mdxFile) {
    const fm = extractFrontmatter(fs.readFileSync(path.join(REPO_ROOT, files.mdxFile), "utf8"));
    if (fm.title) title = fm.title;
    if (fm.description) description = fm.description;
  }
  if ((!title || !description) && files.pageFile) {
    const meta = extractMetaFromTsx(fs.readFileSync(path.join(REPO_ROOT, files.pageFile), "utf8"));
    if (!title && meta.title) title = meta.title;
    if (!description && meta.description) description = meta.description;
  }
  return { title, description };
}

// --- analysis ---------------------------------------------------------

function monthlyBuckets(dailyRows) {
  const byMonth = new Map();
  for (const r of dailyRows) {
    const [dateStr] = r.keys;
    const month = dateStr.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, { impressions: 0, clicks: 0, posWeighted: 0 });
    const b = byMonth.get(month);
    b.impressions += r.impressions;
    b.clicks += r.clicks;
    b.posWeighted += r.position * r.impressions;
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      impressions: b.impressions,
      clicks: b.clicks,
      avgPosition: b.impressions ? Math.round((b.posWeighted / b.impressions) * 10) / 10 : null,
      ctr: b.impressions ? Math.round((b.clicks / b.impressions) * 1000) / 10 : 0,
    }));
}

// Finer than monthly, smoother than daily - a young page's monthly buckets can
// hide a real recent shift inside a partial month.
function weeklyBuckets(dailyRows, currentEnd, weeks = 12) {
  const buckets = [];
  for (let i = 0; i < weeks; i++) {
    const end = addDays(currentEnd, -7 * i);
    const start = addDays(end, -6);
    buckets.unshift({ start, end, impressions: 0, clicks: 0, posWeighted: 0 });
  }
  for (const r of dailyRows) {
    const [dateStr] = r.keys;
    const d = new Date(dateStr);
    for (const b of buckets) {
      if (d >= b.start && d <= b.end) {
        b.impressions += r.impressions;
        b.clicks += r.clicks;
        b.posWeighted += r.position * r.impressions;
        break;
      }
    }
  }
  return buckets
    .filter((b) => b.impressions > 0)
    .map((b) => ({
      weekOf: isoDate(b.start),
      impressions: b.impressions,
      clicks: b.clicks,
      avgPosition: b.impressions ? Math.round((b.posWeighted / b.impressions) * 10) / 10 : null,
      ctr: b.impressions ? Math.round((b.clicks / b.impressions) * 1000) / 10 : 0,
    }));
}

function windowSummary(dailyRows, start, end) {
  let impressions = 0, clicks = 0, posWeighted = 0;
  for (const r of dailyRows) {
    const [dateStr] = r.keys;
    const d = new Date(dateStr);
    if (d >= start && d <= end) {
      impressions += r.impressions;
      clicks += r.clicks;
      posWeighted += r.position * r.impressions;
    }
  }
  return {
    impressions,
    clicks,
    avgPosition: impressions ? Math.round((posWeighted / impressions) * 10) / 10 : null,
    ctr: impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0,
  };
}

async function main() {
  const pathname = process.argv[2];
  if (!pathname) {
    console.error("Usage: node scripts/inspect-page.mjs <path-or-full-url>");
    process.exit(1);
  }
  const cleanPath = (() => {
    try { return new URL(pathname).pathname.replace(/\/$/, "") || "/"; }
    catch { return pathname.replace(/\/$/, "") || "/"; }
  })();
  const siteUrl = process.env.GSC_SITE_URL || "";
  const domain = siteUrl.startsWith("sc-domain:")
    ? siteUrl.replace("sc-domain:", "")
    : new URL(siteUrl).hostname;
  const fullPageUrl = `https://www.${domain}${cleanPath}`;

  const client = getClient();
  const today = new Date();
  const currentEnd = addDays(today, -3);
  const historyStart = addDays(currentEnd, -HISTORY_DAYS);

  console.log(`Fetching ${HISTORY_DAYS} days of history for ${fullPageUrl}...`);
  const [dailyRows, queryRows] = await Promise.all([
    fetchRows(client, isoDate(historyStart), isoDate(currentEnd), ["date"], fullPageUrl),
    fetchRows(client, isoDate(addDays(currentEnd, -90)), isoDate(currentEnd), ["query"], fullPageUrl),
  ]);

  if (dailyRows.length === 0) {
    console.log(`\nNo Search Console data at all for ${fullPageUrl} in the last ${HISTORY_DAYS} days.`);
    console.log(`Either it's brand new, isn't indexed, or the URL doesn't match exactly (check trailing slash/www).`);
    return;
  }

  const files = findFiles(cleanPath);
  const meta = getCurrentMeta(files);

  const recentStart = addDays(currentEnd, -(TREND_WINDOW_DAYS - 1));
  const priorEnd = addDays(recentStart, -1);
  const priorStart = addDays(priorEnd, -(TREND_WINDOW_DAYS - 1));
  const recent = windowSummary(dailyRows, recentStart, currentEnd);
  const prior = windowSummary(dailyRows, priorStart, priorEnd);

  console.log(`\n# ${fullPageUrl}\n`);
  if (meta.title) console.log(`Current title: "${meta.title}"`);
  if (meta.description) console.log(`Current meta description: "${meta.description}"`);
  console.log(`File: ${files.pageFile || "not matched"}`);
  if (files.mdxFile) console.log(`Content: ${files.mdxFile}`);

  console.log(`\n## Last ${TREND_WINDOW_DAYS} days vs prior ${TREND_WINDOW_DAYS} days`);
  console.log(`- Position: ${prior.avgPosition ?? "n/a"} -> ${recent.avgPosition ?? "n/a"}`);
  console.log(`- Impressions: ${prior.impressions} -> ${recent.impressions}`);
  console.log(`- Clicks: ${prior.clicks} -> ${recent.clicks}`);
  console.log(`- CTR: ${prior.ctr}% -> ${recent.ctr}%`);

  console.log(`\n## Month-by-month (position is impression-weighted average)`);
  console.log(`| Month | Avg position | Impressions | Clicks | CTR |`);
  console.log(`|---|---|---|---|---|`);
  for (const m of monthlyBuckets(dailyRows)) {
    console.log(`| ${m.month} | ${m.avgPosition ?? "n/a"} | ${m.impressions} | ${m.clicks} | ${m.ctr}% |`);
  }

  console.log(`\n## Week-by-week (last 12 weeks with data, position is impression-weighted average)`);
  console.log(`| Week of | Avg position | Impressions | Clicks | CTR |`);
  console.log(`|---|---|---|---|---|`);
  for (const w of weeklyBuckets(dailyRows, currentEnd)) {
    console.log(`| ${w.weekOf} | ${w.avgPosition ?? "n/a"} | ${w.impressions} | ${w.clicks} | ${w.ctr}% |`);
  }

  const topQueries = queryRows
    .filter((r) => r.impressions >= 3)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);
  console.log(`\n## Top queries driving this page (last 90 days)`);
  console.log(`| Query | Position | Impressions | Clicks | CTR |`);
  console.log(`|---|---|---|---|---|`);
  for (const r of topQueries) {
    const [query] = r.keys;
    console.log(`| ${query} | ${Math.round(r.position * 10) / 10} | ${r.impressions} | ${r.clicks} | ${Math.round((r.clicks / r.impressions) * 1000) / 10}% |`);
  }
}

main();
