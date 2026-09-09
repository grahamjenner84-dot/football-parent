import { createClient } from "@supabase/supabase-js";
import { matchesKnownBotPattern } from "@/lib/user-agent-bots";
import { getPageViewsForPath } from "@/lib/supabase/page-views";

// Server-only client using the service role key, same pattern as
// lib/supabase/page-views.ts - this must never be imported from client code.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface LogAffiliateClickOptions {
  linkText?: string | null;
  placement?: string | null;
  userAgent?: string | null;
}

const FLOOD_WINDOW_MS = 60_000;
// Far below the page_views threshold of 30, because the shapes differ: a
// popular page genuinely gets dozens of views a minute, while a single
// affiliate link earning 10 clicks in one minute at this site's traffic is
// somebody holding down a mouse button or a script, not ten readers.
const FLOOD_THRESHOLD = 10;

// True if `path` has already logged >= FLOOD_THRESHOLD clicks in the last
// minute. Silent drop rather than a 429, same reasoning as the page_views
// flood guard: the beacon ignores the response anyway, and there is nothing
// to gain by telling whatever is hammering the endpoint that it was caught.
async function clickRecentlyFlooded(
  supabase: ReturnType<typeof adminClient>,
  path: string
): Promise<boolean> {
  const since = new Date(Date.now() - FLOOD_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("affiliate_clicks")
    .select("id", { count: "exact", head: true })
    .eq("path", path)
    .gte("created_at", since);

  if (error) return false;
  return (count ?? 0) >= FLOOD_THRESHOLD;
}

export async function logAffiliateClick(
  path: string,
  href: string,
  merchant: string,
  options: LogAffiliateClickOptions = {}
): Promise<void> {
  const supabase = adminClient();

  if (await clickRecentlyFlooded(supabase, path)) return;

  const { error } = await supabase.from("affiliate_clicks").insert({
    path,
    href,
    merchant,
    link_text: options.linkText ?? null,
    placement: options.placement ?? null,
    user_agent: options.userAgent ?? null,
  });

  if (error) {
    throw new Error("Failed to insert affiliate_clicks row: " + error.message);
  }
}

export interface AffiliateClickDay {
  date: string;
  clicks: number;
}

export interface AffiliateClickPage {
  path: string;
  clicks: number;
  // Human page views of this page over the same window, from page_views with
  // its full bot filtering applied. null when the page has no recorded views
  // at all in the window (a click with no view behind it means something is
  // wrong, and showing a 0% rate would hide that).
  pageViews: number | null;
  // clicks / pageViews. The number this whole table exists for: what share
  // of the people who read this article went to Amazon from it.
  clickRate: number | null;
}

export interface AffiliateClickProduct {
  linkText: string;
  href: string;
  merchant: string;
  clicks: number;
}

export interface AffiliateClickStats {
  days: number;
  // The window actually used, which is the later of `days` ago and the point
  // click logging went live - see AFFILIATE_TRACKING_STARTED_AT.
  since: string;
  clampedToTrackingStart: boolean;
  totalClicks: number;
  byDay: AffiliateClickDay[];
  byPage: AffiliateClickPage[];
  byProduct: AffiliateClickProduct[];
  byPlacement: { placement: string; clicks: number }[];
  // Rows excluded as bot traffic, reported rather than silently dropped so
  // totalClicks + botClicks reconciles with the raw table - same reasoning
  // as PageViewStats.botViews.
  botClicks: number;
}

// How many pages get a page-view denominator. Each one is a separate query
// against page_views, and the pages carrying affiliate links are a handful
// of gear articles, so this is "all of them" with a ceiling on the damage
// if a link ever ends up in a shared component on every page.
const MAX_PAGES_WITH_VIEWS = 25;

// When click logging actually started running in production (the merge of
// the tracker to main; the deploy completed two or three minutes later).
//
// The report clamps its window to this, for exactly the reason the banner
// test does - see BANNER_TEST_STARTED_AT in app/components/CoachAppBanner.tsx.
// The click-out rate divides clicks by page_views of the same article, and
// those articles have months of view history from before any click could be
// recorded. Unclamped, the first 30 days report a handful of clicks against
// thousands of views and the rate is meaningless until the old traffic ages
// out: the first reading was 1 click against 206 views, where 205 of those
// views happened before the tracker existed.
//
// Anchored to the merge rather than the deploy finishing, so no real click
// can fall outside the window. It slightly overstates the denominator, by
// the two or three minutes of views between the two, which at this traffic
// is a view or none at all.
//
// Update this only if click tracking is torn out and restarted.
export const AFFILIATE_TRACKING_STARTED_AT = "2026-09-09T08:13:00Z";

export async function getAffiliateClickStats(days: number = 30): Promise<AffiliateClickStats> {
  const supabase = adminClient();

  // Never look further back than the point click logging went live, on both
  // sides of the ratio - see AFFILIATE_TRACKING_STARTED_AT.
  const requestedSince = Date.now() - days * 24 * 60 * 60 * 1000;
  const trackingStart = new Date(AFFILIATE_TRACKING_STARTED_AT).getTime();
  const clampedToTrackingStart = trackingStart > requestedSince;
  const sinceMs = Math.max(requestedSince, trackingStart);
  const since = new Date(sinceMs).toISOString();

  const rows: {
    path: string;
    href: string;
    merchant: string;
    link_text: string | null;
    placement: string | null;
    user_agent: string | null;
    created_at: string;
  }[] = [];

  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("affiliate_clicks")
      .select("path, href, merchant, link_text, placement, user_agent, created_at")
      .gte("created_at", since)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error("Failed to read affiliate_clicks: " + error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  // The API route already refuses a self-declared bot (and a missing UA) at
  // insert time; this re-filter catches rows written before a pattern was
  // added to lib/user-agent-bots.ts, same as page_views does retroactively.
  const humanRows = rows.filter(
    (row) => !row.user_agent || !matchesKnownBotPattern(row.user_agent)
  );
  const botClicks = rows.length - humanRows.length;

  const dayCounts = new Map<string, number>();
  const pathCounts = new Map<string, number>();
  const productCounts = new Map<string, AffiliateClickProduct>();
  const placementCounts = new Map<string, number>();

  for (const row of humanRows) {
    const date = row.created_at.slice(0, 10);
    dayCounts.set(date, (dayCounts.get(date) ?? 0) + 1);
    pathCounts.set(row.path, (pathCounts.get(row.path) ?? 0) + 1);

    const placement = row.placement ?? "unknown";
    placementCounts.set(placement, (placementCounts.get(placement) ?? 0) + 1);

    // Keyed on href, not on link text: the same product is linked with
    // different wording in different places ("Mitre Impel", "the ball we
    // actually use"), and it is the destination that earns the commission.
    const existing = productCounts.get(row.href);
    if (existing) {
      existing.clicks += 1;
    } else {
      productCounts.set(row.href, {
        linkText: row.link_text ?? row.href,
        href: row.href,
        merchant: row.merchant,
        clicks: 1,
      });
    }
  }

  // Zero-filled, so a day with no clicks reads as a real zero rather than
  // vanishing from the chart - same convention as getPageViewsForPath.
  const byDay: AffiliateClickDay[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const cursor = new Date(`${since.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(`${today}T00:00:00.000Z`);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    byDay.push({ date, clicks: dayCounts.get(date) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const rankedPaths = Array.from(pathCounts.entries()).sort((a, b) => b[1] - a[1]);

  const byPage: AffiliateClickPage[] = await Promise.all(
    rankedPaths.map(async ([path, clicks], index) => {
      if (index >= MAX_PAGES_WITH_VIEWS) {
        return { path, clicks, pageViews: null, clickRate: null };
      }

      // Reuses page_views' own bot exclusions and recording-start rules
      // rather than counting rows here, so the denominator is counted
      // exactly as the Page views tab counts it.
      //
      // Fractional days on purpose: getPageViewsForPath takes a number of
      // days back, and the window here is usually a partial day since
      // tracking went live rather than a whole number of them.
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

  return {
    days,
    since,
    clampedToTrackingStart,
    totalClicks: humanRows.length,
    byDay,
    byPage,
    byProduct: Array.from(productCounts.values()).sort((a, b) => b.clicks - a.clicks),
    byPlacement: Array.from(placementCounts.entries())
      .map(([placement, clicks]) => ({ placement, clicks }))
      .sort((a, b) => b.clicks - a.clicks),
    botClicks,
  };
}
