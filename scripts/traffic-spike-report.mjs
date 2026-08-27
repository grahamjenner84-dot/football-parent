#!/usr/bin/env node
/**
 * Hour-by-hour breakdown of page_views for one path on one day, to
 * investigate a traffic spike (e.g. "300 views between 11pm-12am").
 *
 * Run locally:
 *   node scripts/traffic-spike-report.mjs [path] [YYYY-MM-DD]
 *
 * Defaults to /academy-pathway/what-is-eppp and 2026-08-26 (the day of the
 * reported EPPP spike). Hours are bucketed in Europe/London local time,
 * since "11pm" almost certainly means UK local time, not the UTC the
 * created_at timestamptz is stored in.
 *
 * Requires the same Supabase env vars as lib/supabase/page-views.ts
 * (football-parent-social project, NOT the Coach App project):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Loaded from .env.local automatically if present.
 *
 * IMPORTANT limit: page_views (see supabase/migrations/20260819120000_page_views.sql)
 * deliberately stores only path, created_at and referrer_host - no IP, no
 * user-agent, no session id, by design (anonymous, consent-independent
 * logging). This script can show WHEN the spike happened and what referrer
 * hosts (if any) it carried, but it cannot fingerprint individual bots -
 * that would need a schema change or a separate log source (e.g. Vercel's
 * request logs) this script doesn't touch.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

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

const targetPath = process.argv[2] || "/academy-pathway/what-is-eppp";
const targetDate = process.argv[3] || "2026-08-26";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (check .env.local).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Widen the query range by a day either side so a Europe/London evening
// bucket that falls on/near a UTC day boundary isn't clipped.
const sinceUtc = new Date(`${targetDate}T00:00:00Z`);
sinceUtc.setUTCDate(sinceUtc.getUTCDate() - 1);
const untilUtc = new Date(`${targetDate}T00:00:00Z`);
untilUtc.setUTCDate(untilUtc.getUTCDate() + 2);

const londonHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
});

function londonDateHour(isoTimestamp) {
  const parts = londonHourFormatter.formatToParts(new Date(isoTimestamp));
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour };
}

async function fetchAllRows(query) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

// 1. Hourly counts for the target path (with referrer_host breakdown).
const pathRows = await fetchAllRows(
  supabase
    .from("page_views")
    .select("created_at, referrer_host")
    .eq("path", targetPath)
    .gte("created_at", sinceUtc.toISOString())
    .lt("created_at", untilUtc.toISOString())
    .order("id", { ascending: true })
);

// 2. Hourly totals for the whole site over the same window, for comparison
// (isolated-page spike vs. site-wide spike).
const siteRows = await fetchAllRows(
  supabase
    .from("page_views")
    .select("created_at")
    .gte("created_at", sinceUtc.toISOString())
    .lt("created_at", untilUtc.toISOString())
    .order("id", { ascending: true })
);

const pathByHour = new Map(); // "YYYY-MM-DD HH" -> { count, referrers: Map }
const siteByHour = new Map(); // "YYYY-MM-DD HH" -> count

for (const row of pathRows) {
  const { date, hour } = londonDateHour(row.created_at);
  const key = `${date} ${hour}:00`;
  const bucket = pathByHour.get(key) ?? { count: 0, referrers: new Map() };
  bucket.count += 1;
  const ref = row.referrer_host || "(none)";
  bucket.referrers.set(ref, (bucket.referrers.get(ref) ?? 0) + 1);
  pathByHour.set(key, bucket);
}

for (const row of siteRows) {
  const { date, hour } = londonDateHour(row.created_at);
  const key = `${date} ${hour}:00`;
  siteByHour.set(key, (siteByHour.get(key) ?? 0) + 1);
}

const allHourKeys = Array.from(new Set([...pathByHour.keys(), ...siteByHour.keys()])).sort();
const relevantKeys = allHourKeys.filter((k) => k.startsWith(targetDate));

console.log(`Hourly report (Europe/London local time) for ${targetPath} on ${targetDate}\n`);
console.log("local_hour            path_views   site_total_views   top_referrers_for_path");
for (const key of relevantKeys) {
  const p = pathByHour.get(key) ?? { count: 0, referrers: new Map() };
  const siteTotal = siteByHour.get(key) ?? 0;
  const topReferrers = Array.from(p.referrers.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([host, count]) => `${host}=${count}`)
    .join(", ");
  console.log(
    `${key}  ${String(p.count).padStart(10)}   ${String(siteTotal).padStart(15)}   ${topReferrers}`
  );
}

const dayPathTotal = relevantKeys.reduce((sum, k) => sum + (pathByHour.get(k)?.count ?? 0), 0);
const daySiteTotal = relevantKeys.reduce((sum, k) => sum + (siteByHour.get(k) ?? 0), 0);
console.error(
  `\nTotals for ${targetDate} (Europe/London): ${targetPath}=${dayPathTotal}, site=${daySiteTotal}`
);
console.error(
  "\nNote: page_views has no IP/user-agent/session id (by design, see migration comments) - " +
    "this can only show timing and referrer_host, not fingerprint individual clients."
);
