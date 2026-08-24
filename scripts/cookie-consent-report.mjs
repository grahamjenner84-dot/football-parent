#!/usr/bin/env node
/**
 * Day-by-day cookie consent banner report.
 *
 * Run locally (not deployed - this is a CLI helper, not a route):
 *   node scripts/cookie-consent-report.mjs [days]
 *
 * Requires the same Supabase env vars as lib/supabase/cookie-consent.ts
 * (football-parent-social project, NOT the Coach App project):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Loaded from .env.local automatically if present.
 *
 * Prints one row per day: banner shows, accept/reject/manage counts, and
 * accept rate - useful for lining up against a Google Analytics pageview
 * dip to check whether it tracks the reject rate (expected, since GA can't
 * see visitors who deny analytics_storage) rather than a real traffic drop.
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

const days = Number(process.argv[2]) || 30;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (check .env.local).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const { data, error } = await supabase
  .from("cookie_consent_events")
  .select("action, analytics_granted, advertising_granted, created_at")
  .gte("created_at", since)
  .order("created_at", { ascending: true });

if (error) {
  console.error("Failed to read cookie_consent_events:", error.message);
  process.exit(1);
}

const rows = data ?? [];
const byDay = new Map();

for (const row of rows) {
  const day = row.created_at.slice(0, 10);
  const bucket =
    byDay.get(day) ??
    { shown: 0, acceptAll: 0, rejectAll: 0, savePreferences: 0 };

  if (row.action === "banner_shown") bucket.shown += 1;
  else if (row.action === "accept_all") bucket.acceptAll += 1;
  else if (row.action === "reject_all") bucket.rejectAll += 1;
  else if (row.action === "save_preferences") bucket.savePreferences += 1;

  byDay.set(day, bucket);
}

const sortedDays = Array.from(byDay.keys()).sort();

if (sortedDays.length === 0) {
  console.log(`No cookie_consent_events rows in the last ${days} days.`);
  process.exit(0);
}

const header = [
  "date",
  "shown",
  "accept_all",
  "reject",
  "manage_save",
  "decisions",
  "accept_rate",
  "shown_to_decision_rate",
];
console.log(header.join(","));

let totals = { shown: 0, acceptAll: 0, rejectAll: 0, savePreferences: 0 };

for (const day of sortedDays) {
  const b = byDay.get(day);
  const decisions = b.acceptAll + b.rejectAll + b.savePreferences;
  const acceptRate =
    b.acceptAll + b.rejectAll > 0
      ? (b.acceptAll / (b.acceptAll + b.rejectAll)) * 100
      : null;
  const shownToDecision = b.shown > 0 ? (decisions / b.shown) * 100 : null;

  console.log(
    [
      day,
      b.shown,
      b.acceptAll,
      b.rejectAll,
      b.savePreferences,
      decisions,
      acceptRate === null ? "" : acceptRate.toFixed(1),
      shownToDecision === null ? "" : shownToDecision.toFixed(1),
    ].join(",")
  );

  totals.shown += b.shown;
  totals.acceptAll += b.acceptAll;
  totals.rejectAll += b.rejectAll;
  totals.savePreferences += b.savePreferences;
}

const totalDecisions = totals.acceptAll + totals.rejectAll + totals.savePreferences;
const totalAcceptRate =
  totals.acceptAll + totals.rejectAll > 0
    ? (totals.acceptAll / (totals.acceptAll + totals.rejectAll)) * 100
    : null;

console.error(
  `\nTotals (last ${days}d): shown=${totals.shown} accept_all=${totals.acceptAll} reject=${totals.rejectAll} manage_save=${totals.savePreferences} decisions=${totalDecisions}` +
    (totalAcceptRate === null ? "" : ` accept_rate=${totalAcceptRate.toFixed(1)}%`)
);
