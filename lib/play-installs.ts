// Google Play install statistics for the Coach App's Android app, read from
// Play Console's bulk reports in Cloud Storage. Read-only: the site's Search
// Console service account (keyword-agent@football-parent-keyword-agent) has
// "View app information and download bulk reports (read-only)" in Play
// Console, and this asks only for devstorage.read_only.
//
// Play posts one CSV per month per dimension, UTF-16LE, 3-7 days behind.
// Numbers are passed through as the files give them.

import { JWT } from "google-auth-library";

const BUCKET = "pubsite_prod_7505496605632837477"; // Play Console > Download reports > Statistics
const PACKAGE = "uk.co.footballparent.coachapp";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// What each column means, from Google's own definitions where it gives one
// (Play Console Help 9419939) and from this app's files where it does not.
export const PLAY_FIELDS: Record<string, string> = {
  "Daily Device Installs": "New devices that installed the app that day (Play Console: Devices > Device acquisition > New devices).",
  "Daily User Installs": "New users who installed that day (Play Console: Users > User acquisitions > New users).",
  "Daily User Uninstalls": "Users who uninstalled that day (Play Console: Users > User loss). Uninstalls only: unlike the console's device loss, it does not count devices that went unused for 30+ days.",
  "Install events": "Every install that day, including reinstalls on the same device (Devices > Install events).",
  "Uninstall events": "Every uninstall that day (Devices > Uninstall events).",
  "Update events": "App updates installed that day.",
  "Active Device Installs":
    "Install base: devices with the app installed that have checked in with Google at least once in the past 30 days (Devices > Active devices). It falls when someone uninstalls and when a device goes unused for 30 days, so it is the nearest thing here to installs minus losses.",
  "Total User Installs": "Retired by Google: 0 on every day in this app's files since Sept 2026. Not a running total; ignore it.",
  "Daily Device Uninstalls": "Retired by Google: 0 on every day in this app's files. Use Daily User Uninstalls or Uninstall events.",
  "Daily Device Upgrades": "Retired by Google: 0 on every day in this app's files. Use Update events.",
};

let client: JWT | null = null;
function getClient(): JWT {
  if (client) return client;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY env vars");
  client = new JWT({ email, key: rawKey.replace(/\\n/g, "\n"), scopes: ["https://www.googleapis.com/auth/devstorage.read_only"] });
  return client;
}

export class PlayReportsError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Google Cloud Storage ${status}: ${body}`);
  }
}

type Row = Record<string, string | number>;

// One month's file, or null when Play has not posted it yet.
async function readMonth(month: string, dimension: "overview" | "country"): Promise<Row[] | null> {
  const name = `stats/installs/installs_${PACKAGE}_${month}_${dimension}.csv`;
  const { token } = await getClient().getAccessToken();
  const res = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(name)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new PlayReportsError(res.status, await res.text());
  const text = Buffer.from(await res.arrayBuffer()).toString("utf16le").replace(/^﻿/, "");
  const [header, ...lines] = text.split(/\r?\n/).filter((l) => l.trim());
  const cols = header.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    const row: Row = {};
    cols.forEach((c, i) => {
      if (c === "Package name") return;
      const v = cells[i] ?? "";
      row[c] = c === "Date" || c === "Country" || !/^-?\d+$/.test(v) ? v : Number(v);
    });
    return row;
  });
}

function monthsBetween(start: string, end: string): string[] {
  const months: string[] = [];
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7));
  const last = Number(end.slice(0, 4)) * 12 + Number(end.slice(5, 7));
  while (y * 12 + m <= last) {
    months.push(`${y}${String(m).padStart(2, "0")}`);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

export async function getPlayInstallStats(opts: { startDate: string; endDate: string; country?: string }) {
  const { startDate, endDate } = opts;
  if (!DATE.test(startDate) || !DATE.test(endDate)) throw new Error("startDate and endDate must be YYYY-MM-DD.");
  if (startDate > endDate) throw new Error("startDate is after endDate.");
  const country = opts.country?.toUpperCase();
  const months = monthsBetween(startDate, endDate);

  const files = await Promise.all(months.map(async (m) => ({ month: m, overview: await readMonth(m, "overview"), country: await readMonth(m, "country") })));
  const inRange = (r: Row) => String(r.Date) >= startDate && String(r.Date) <= endDate;
  const byDay = files.flatMap((f) => f.overview ?? []).filter(inRange);
  let byDayAndCountry = files.flatMap((f) => f.country ?? []).filter(inRange);
  if (country) byDayAndCountry = byDayAndCountry.filter((r) => r.Country === country);
  const latestDate = [...byDay].map((r) => String(r.Date)).sort().pop() ?? null;

  return {
    package: PACKAGE,
    dateRange: { startDate, endDate },
    ...(country ? { country } : {}),
    monthsRead: files.map((f) => ({ month: f.month, posted: f.overview !== null })),
    latestDate,
    note:
      "Columns are Play's own names, values exactly as the bulk report files give them. Play posts each day 3-7 days late, so the newest days are missing, not zero (latestDate is the last day in the files). Days with no activity at all may have no row. Country is ISO 3166-1 alpha-2; ZZ is Play's 'unknown'. byDay is Play's overview file (all countries); byDayAndCountry is its country file. There is no 'device loss' column: Daily User Uninstalls and Uninstall events are uninstalls only, and devices that stop being used show up only as a fall in Active Device Installs. See fields for what each column means.",
    fields: PLAY_FIELDS,
    byDay,
    byDayAndCountry,
  };
}
