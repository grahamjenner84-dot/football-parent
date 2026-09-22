import { createClient } from "@supabase/supabase-js";
import { matchesKnownBotPattern } from "@/lib/user-agent-bots";
import { getPageViewsForPath } from "@/lib/supabase/page-views";
import { OUTBOUND_PARTNERS } from "@/lib/outbound-partners";

// Server-only client using the service role key, same pattern as
// lib/supabase/page-views.ts and lib/supabase/affiliate-clicks.ts - this must
// never be imported from client code.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface LogPartnerClickOptions {
  linkText?: string | null;
  userAgent?: string | null;
}

const FLOOD_WINDOW_MS = 60_000;
// Same low threshold as affiliate_clicks: a single partner link earning 10
// clicks in one minute at this site's traffic is somebody holding a mouse
// button or a script, not ten readers.
const FLOOD_THRESHOLD = 10;

async function clickRecentlyFlooded(
  supabase: ReturnType<typeof adminClient>,
  path: string
): Promise<boolean> {
  const since = new Date(Date.now() - FLOOD_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("partner_clicks")
    .select("id", { count: "exact", head: true })
    .eq("path", path)
    .gte("created_at", since);

  if (error) return false;
  return (count ?? 0) >= FLOOD_THRESHOLD;
}

export async function logPartnerClick(
  path: string,
  href: string,
  partner: string,
  host: string,
  options: LogPartnerClickOptions = {}
): Promise<void> {
  const supabase = adminClient();

  if (await clickRecentlyFlooded(supabase, path)) return;

  const { error } = await supabase.from("partner_clicks").insert({
    path,
    href,
    partner,
    host,
    link_text: options.linkText ?? null,
    user_agent: options.userAgent ?? null,
  });

  if (error) {
    throw new Error("Failed to insert partner_clicks row: " + error.message);
  }
}

export interface PartnerClickPageCount {
  path: string;
  clicks: number;
}

export interface PartnerClickDay {
  date: string;
  clicks: number;
  // Per-day by-page breakdown so the report can filter to a single day. No
  // page-view denominator per day on purpose, same as affiliate_clicks: a
  // click-out rate for one day divides a handful of clicks by one day's views
  // and is too noisy to mean anything.
  byPage: PartnerClickPageCount[];
}

export interface PartnerClickPage {
  path: string;
  clicks: number;
  // Human page views of this page over the same window, from page_views with
  // its full bot filtering applied. null when the page has no recorded views
  // in the window.
  pageViews: number | null;
  // clicks / pageViews: what share of the people who read this article clicked
  // through to the partner from it.
  clickRate: number | null;
}

export interface PartnerClickPartner {
  slug: string;
  label: string;
  clicks: number;
}

export interface PartnerClickStats {
  days: number;
  // The window actually used: the later of `days` ago and the point partner
  // click logging went live - see PARTNER_TRACKING_STARTED_AT.
  since: string;
  clampedToTrackingStart: boolean;
  totalClicks: number;
  byDay: PartnerClickDay[];
  byPage: PartnerClickPage[];
  byPartner: PartnerClickPartner[];
  // Rows excluded as bot traffic, reported rather than silently dropped so
  // totalClicks + botClicks reconciles with the raw table.
  botClicks: number;
}

// How many pages get a page-view denominator, one query each. Partner links
// today sit across ~20 academy/development articles, so this covers all of
// them with a ceiling on the damage if a link ever lands in a shared
// component on every page.
const MAX_PAGES_WITH_VIEWS = 30;

// When partner click logging went live in production (the merge of this
// tracker to main; the deploy completed a couple of minutes later).
//
// The report clamps its window to this for the same reason affiliate_clicks
// does (see AFFILIATE_TRACKING_STARTED_AT): the click-out rate divides clicks
// by page_views of the same article, and those articles have months of view
// history from before any partner click could be recorded. Unclamped, the
// first readings would divide a few clicks by thousands of pre-existing views
// and call the result a click-out rate.
//
// Anchored to the start of the merge day (UTC) rather than the exact deploy
// minute, so no real click can fall outside the window - the tracker cannot
// log before it is deployed, and it deploys on this day. It slightly overstates
// the denominator by that day's pre-deploy views, which at this traffic is a
// handful at most.
//
// Update this only if partner click tracking is torn out and restarted.
export const PARTNER_TRACKING_STARTED_AT = "2026-09-22T00:00:00Z";

type ClickRow = {
  path: string;
  href: string;
  partner: string;
  host: string;
  link_text: string | null;
  user_agent: string | null;
  created_at: string;
};

function buildPageCounts(rows: ClickRow[]): PartnerClickPageCount[] {
  const byPath = new Map<string, number>();
  for (const row of rows) byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
  return Array.from(byPath.entries())
    .map(([path, clicks]) => ({ path, clicks }))
    .sort((a, b) => b.clicks - a.clicks);
}

export async function getPartnerClickStats(days: number = 30): Promise<PartnerClickStats> {
  const supabase = adminClient();

  // Never look further back than the point partner click logging went live, on
  // both sides of the ratio - see PARTNER_TRACKING_STARTED_AT.
  const requestedSince = Date.now() - days * 24 * 60 * 60 * 1000;
  const trackingStart = new Date(PARTNER_TRACKING_STARTED_AT).getTime();
  const clampedToTrackingStart = trackingStart > requestedSince;
  const sinceMs = Math.max(requestedSince, trackingStart);
  const since = new Date(sinceMs).toISOString();

  const rows: ClickRow[] = [];

  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("partner_clicks")
      .select("path, href, partner, host, link_text, user_agent, created_at")
      .gte("created_at", since)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error("Failed to read partner_clicks: " + error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  // The API route already refuses a self-declared bot (and a missing UA) at
  // insert time; this re-filter catches rows written before a pattern was
  // added to lib/user-agent-bots.ts, same as page_views and affiliate_clicks.
  const humanRows = rows.filter(
    (row) => !row.user_agent || !matchesKnownBotPattern(row.user_agent)
  );
  const botClicks = rows.length - humanRows.length;

  const labelForSlug = new Map(OUTBOUND_PARTNERS.map((p) => [p.slug, p.label]));

  const rowsByDate = new Map<string, ClickRow[]>();
  const pathCounts = new Map<string, number>();
  const partnerCounts = new Map<string, number>();

  for (const row of humanRows) {
    const date = row.created_at.slice(0, 10);
    if (!rowsByDate.has(date)) rowsByDate.set(date, []);
    rowsByDate.get(date)!.push(row);

    pathCounts.set(row.path, (pathCounts.get(row.path) ?? 0) + 1);
    partnerCounts.set(row.partner, (partnerCounts.get(row.partner) ?? 0) + 1);
  }

  // Zero-filled, so a day with no clicks reads as a real zero rather than
  // vanishing from the chart - same convention as affiliate_clicks.
  const byDay: PartnerClickDay[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const cursor = new Date(`${since.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(`${today}T00:00:00.000Z`);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    const dayRows = rowsByDate.get(date) ?? [];
    byDay.push({
      date,
      clicks: dayRows.length,
      byPage: buildPageCounts(dayRows),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const rankedPaths = Array.from(pathCounts.entries()).sort((a, b) => b[1] - a[1]);

  const byPage: PartnerClickPage[] = await Promise.all(
    rankedPaths.map(async ([path, clicks], index) => {
      if (index >= MAX_PAGES_WITH_VIEWS) {
        return { path, clicks, pageViews: null, clickRate: null };
      }

      // Reuses page_views' own bot exclusions and recording-start rules rather
      // than counting rows here, so the denominator is counted exactly as the
      // Page views tab counts it. Fractional days: getPageViewsForPath takes a
      // number of days back and this window is usually a partial day.
      const windowDays = (Date.now() - sinceMs) / (24 * 60 * 60 * 1000);
      const daily = await getPageViewsForPath(path, windowDays).catch(() => []);
      const pageViews = daily.reduce((sum, d) => sum + d.count, 0);

      return {
        path,
        clicks,
        pageViews: pageViews > 0 ? pageViews : null,
        clickRate: pageViews > 0 ? clicks / pageViews : null,
      };
    })
  );

  const byPartner: PartnerClickPartner[] = Array.from(partnerCounts.entries())
    .map(([slug, clicks]) => ({ slug, label: labelForSlug.get(slug) ?? slug, clicks }))
    .sort((a, b) => b.clicks - a.clicks);

  return {
    days,
    since,
    clampedToTrackingStart,
    totalClicks: humanRows.length,
    byDay,
    byPage,
    byPartner,
    botClicks,
  };
}
