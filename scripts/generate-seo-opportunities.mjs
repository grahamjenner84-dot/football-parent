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
const DECAY_MIN_PRIOR_CLICKS = 5;
const CURRENT_PERIOD_DAYS = 90;
const COMPARE_PERIOD_DAYS = 90;

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

async function fetchRows(client, startDate, endDate, dimensions) {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) {
    console.error("Missing GSC_SITE_URL");
    process.exit(1);
  }
  const rows = [];
  let startRow = 0;
  const rowLimit = 25000;
  while (true) {
    const res = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/searchAnalytics/query`,
      method: "POST",
      data: { startDate, endDate, dimensions, rowLimit, startRow },
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

  for (const section of ["striking_distance", "low_ctr", "decay"]) {
    const rows = opportunities.filter((o) => o.type === section);
    if (!rows.length) continue;
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

async function main() {
  const client = getClient();

  const today = new Date();
  const currentEnd = addDays(today, -3);
  const currentStart = addDays(currentEnd, -CURRENT_PERIOD_DAYS);
  const priorEnd = addDays(currentStart, -1);
  const priorStart = addDays(priorEnd, -COMPARE_PERIOD_DAYS);

  console.log("Fetching GSC data...");
  const [queryPageRows, pageRowsCurrent, pageRowsPrior] = await Promise.all([
    fetchRows(client, isoDate(currentStart), isoDate(currentEnd), ["query", "page"]),
    fetchRows(client, isoDate(currentStart), isoDate(currentEnd), ["page"]),
    fetchRows(client, isoDate(priorStart), isoDate(priorEnd), ["page"]),
  ]);

  const opportunities = [
    ...analyseStrikingDistance(queryPageRows),
    ...analyseLowCtr(pageRowsCurrent),
    ...analyseDecay(pageRowsCurrent, pageRowsPrior),
  ];

  console.log("Scanning repo for matching files...");
  const routeMap = buildRouteMap();

  const matched = opportunities.map((row) => ({
    ...row,
    match: matchFile(routeMap, row.page),
  }));

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
  console.log(`  Opportunities found: ${opportunities.length}`);
  console.log(`  Matched to a file: ${matchedCount}`);
  console.log(`  Unmatched: ${opportunities.length - matchedCount}`);
  console.log(`\n  seo-opportunities.json and seo-opportunities.md written to repo root.`);
}

main();
