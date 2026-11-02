// Firebase Analytics for the Coach App's Android app, read through the Google
// Analytics Data API (v1beta runReport) on its GA4 property. Read-only:
// analytics.readonly scope, and the service account is only a Viewer.
//
// Uses the site's existing Search Console service account (keyword-agent@
// football-parent-keyword-agent), not any Coach App or Firebase key: those
// can touch an app that holds children's data, this only needs counts.
//
// Every number is passed through as the API returned it (metric values
// arrive as strings). GA4 can withhold small numbers (thresholding) or fold
// rows into "(other)"; the response metadata saying so is returned as-is.

import { JWT } from "google-auth-library";

// "football-parent-coach-app" under the Football Parent Analytics account,
// stream "Coach App Android" (15857272963). Not a secret.
const PROPERTY = "properties/556206553";
const API = `https://analyticsdata.googleapis.com/v1beta/${PROPERTY}:runReport`;

export const ANDROID_EVENTS = [
  "first_open",
  "sign_up",
  "onboarding_complete",
  "squad_added",
  "app_remove",
  "notification_receive",
  "notification_open",
  "notification_dismiss",
  "app_update",
] as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class AnalyticsApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Google Analytics Data API ${status}: ${body}`);
  }
}

let client: JWT | null = null;
function getClient(): JWT {
  if (client) return client;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY env vars");
  client = new JWT({ email, key: rawKey.replace(/\\n/g, "\n"), scopes: ["https://www.googleapis.com/auth/analytics.readonly"] });
  return client;
}

type ReportRow = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Report = { rows?: ReportRow[]; metadata?: Record<string, unknown>; rowCount?: number };

async function runReport(body: object): Promise<Report> {
  const { token } = await getClient().getAccessToken();
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new AnalyticsApiError(res.status, text);
  return JSON.parse(text);
}

// GA4 returns dates as YYYYMMDD.
const isoDate = (d: string) => (/^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : d);
const dim = (r: ReportRow, i: number) => r.dimensionValues?.[i]?.value ?? null;
const met = (r: ReportRow, i: number) => r.metricValues?.[i]?.value ?? null;

export async function getAndroidAppAnalytics(opts: { startDate: string; endDate: string }) {
  const { startDate, endDate } = opts;
  if (!DATE.test(startDate) || !DATE.test(endDate)) throw new Error("startDate and endDate must be YYYY-MM-DD.");
  const dateRanges = [{ startDate, endDate }];

  const [active, events, versions, retention] = await Promise.all([
    runReport({
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      keepEmptyRows: true,
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "date" }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
      dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: [...ANDROID_EVENTS] } } },
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 10000,
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "date" }, { name: "appVersion" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 10000,
    }),
    // One cohort: everyone whose first session fell in the range, followed
    // for 7 days. cohortNthDay 0001 is day-1, 0007 is day-7.
    runReport({
      dimensions: [{ name: "cohort" }, { name: "cohortNthDay" }],
      metrics: [{ name: "cohortActiveUsers" }, { name: "cohortTotalUsers" }],
      cohortSpec: {
        cohorts: [{ name: "first_session_in_range", dimension: "firstSessionDate", dateRange: { startDate, endDate } }],
        cohortsRange: { granularity: "DAILY", endOffset: 7 },
      },
    }),
  ]);

  const byDay = new Map<string, { date: string; activeUsers: string | null; events: Record<string, { eventCount: string | null; uniqueUsers: string | null }>; activeUsersByAppVersion: Record<string, string | null> }>();
  const day = (d: string) => {
    if (!byDay.has(d)) byDay.set(d, { date: d, activeUsers: null, events: {}, activeUsersByAppVersion: {} });
    return byDay.get(d)!;
  };
  for (const r of active.rows ?? []) day(isoDate(dim(r, 0)!)).activeUsers = met(r, 0);
  for (const r of events.rows ?? []) day(isoDate(dim(r, 0)!)).events[dim(r, 1)!] = { eventCount: met(r, 0), uniqueUsers: met(r, 1) };
  for (const r of versions.rows ?? []) day(isoDate(dim(r, 0)!)).activeUsersByAppVersion[dim(r, 1) ?? "(none)"] = met(r, 0);

  const retentionRows = (retention.rows ?? [])
    .map((r) => ({
      nthDay: dim(r, 1),
      cohortActiveUsers: met(r, 0),
      cohortTotalUsers: met(r, 1),
    }))
    .sort((a, b) => (a.nthDay ?? "").localeCompare(b.nthDay ?? ""));
  const at = (n: string) => retentionRows.find((r) => r.nthDay === n) ?? null;
  const seen = new Set((events.rows ?? []).map((r) => dim(r, 1)));

  return {
    property: PROPERTY,
    dateRange: { startDate, endDate },
    note:
      "Numbers are exactly as the Google Analytics Data API returned them (strings). Days are the GA4 property's time zone (metadata.timeZone, Etc/GMT when checked), not UK local time. first_open is listed but is never recorded for this app: it fires on the very first launch, while every consent type is still denied by default (AndroidManifest.xml), so Firebase sends it as an unattributed ping that reports never show; it is not re-sent once the coach accepts the banner. uniqueUsers is GA4's totalUsers for that event that day. An event missing from a day had no rows that day; eventsNeverSeen lists any that had none in the whole range. GA4 can withhold small counts when thresholding applies: metadata says whether it did. Retention counts users whose first session fell in the range: users who started near the end have not had 7 days yet but are still in cohortTotalUsers.",
    eventsNeverSeen: ANDROID_EVENTS.filter((e) => !seen.has(e)),
    byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    retention: {
      cohort: "first session between startDate and endDate",
      day1: at("0001"),
      day7: at("0007"),
      byNthDay: retentionRows,
    },
    metadata: {
      activeUsers: active.metadata ?? null,
      events: events.metadata ?? null,
      appVersions: versions.metadata ?? null,
      retention: retention.metadata ?? null,
    },
  };
}
