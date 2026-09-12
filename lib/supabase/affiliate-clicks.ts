import { createClient } from "@supabase/supabase-js";
import { matchesKnownBotPattern } from "@/lib/user-agent-bots";
import { getPageViewsForPath } from "@/lib/supabase/page-views";
import { getAffiliateProductNames, normalizeAffiliateHref } from "@/lib/affiliate-products";

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

export interface AffiliateClickPageCount {
  path: string;
  clicks: number;
}

export interface AffiliateClickDay {
  date: string;
  clicks: number;
  // Per-day breakdowns so the report can filter to a single day. No page-view
  // denominator here on purpose: a click-out rate for one day divides a
  // handful of clicks by one day's views and is too noisy to mean anything -
  // the rate lives on the whole-window byPage below.
  byPage: AffiliateClickPageCount[];
  byProduct: AffiliateClickProduct[];
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

// One physical link that points at a product: a specific URL, in a specific
// placement, on a specific page. The same product can have several (a quick-
// picks button near the top and an inline mention lower down, or a full
// amazon.co.uk link in one article and an amzn.to short link in another) - so
// this is what answers "which link is actually pulling the clicks", e.g.
// whether the links at the top of the shin-pads article beat the inline ones.
export interface AffiliateClickProductLink {
  href: string;
  // The raw anchor text as logged, kept for reference.
  linkText: string;
  // gear-picks | inline | unknown - which component rendered it.
  placement: string;
  // The article the click came from.
  path: string;
  clicks: number;
}

export interface AffiliateClickProduct {
  // The name to show: the product's real name resolved from the content
  // (getAffiliateProductNames), falling back to the anchor text logged at
  // click time, falling back to the URL. This is what stops the table reading
  // "View on Amazon" for every GearPicks button. Clicks for a product are
  // summed across every link/placement/page below, so this is one row per
  // product, not per URL.
  name: string;
  merchant: string;
  clicks: number;
  // Breakdown of the clicks by individual link, busiest first.
  links: AffiliateClickProductLink[];
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

type ClickRow = {
  path: string;
  href: string;
  merchant: string;
  link_text: string | null;
  placement: string | null;
  user_agent: string | null;
  created_at: string;
};

// A generic anchor text that names the CTA, not the product - the GearPicks
// button says this on every product, so it must never be shown as a product
// name when the content has a real one.
function isGenericLinkText(text: string | null): boolean {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  return t === "" || t === "view on amazon" || t === "buy on amazon" || t.startsWith("http");
}

// Clicks grouped into one row per product (by resolved name), with a
// per-link breakdown underneath so a product linked from more than one place
// still shows where its clicks came from.
function buildProducts(rows: ClickRow[], nameMap: Map<string, string>): AffiliateClickProduct[] {
  const byName = new Map<
    string,
    { name: string; merchant: string; clicks: number; links: Map<string, AffiliateClickProductLink> }
  >();

  for (const row of rows) {
    const resolved = nameMap.get(normalizeAffiliateHref(row.href));
    const name = resolved ?? (isGenericLinkText(row.link_text) ? row.href : row.link_text!);

    let product = byName.get(name);
    if (!product) {
      product = { name, merchant: row.merchant, clicks: 0, links: new Map() };
      byName.set(name, product);
    }
    product.clicks += 1;

    const placement = row.placement ?? "unknown";
    const linkKey = `${row.path}|${placement}|${row.href}`;
    const link = product.links.get(linkKey);
    if (link) {
      link.clicks += 1;
    } else {
      product.links.set(linkKey, {
        href: row.href,
        linkText: row.link_text ?? row.href,
        placement,
        path: row.path,
        clicks: 1,
      });
    }
  }

  return Array.from(byName.values())
    .map((p) => ({
      name: p.name,
      merchant: p.merchant,
      clicks: p.clicks,
      links: Array.from(p.links.values()).sort((a, b) => b.clicks - a.clicks),
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

// Click count per article path, no page-view denominator (see AffiliateClickDay).
function buildPageCounts(rows: ClickRow[]): AffiliateClickPageCount[] {
  const byPath = new Map<string, number>();
  for (const row of rows) byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
  return Array.from(byPath.entries())
    .map(([path, clicks]) => ({ path, clicks }))
    .sort((a, b) => b.clicks - a.clicks);
}

export async function getAffiliateClickStats(days: number = 30): Promise<AffiliateClickStats> {
  const supabase = adminClient();

  // Never look further back than the point click logging went live, on both
  // sides of the ratio - see AFFILIATE_TRACKING_STARTED_AT.
  const requestedSince = Date.now() - days * 24 * 60 * 60 * 1000;
  const trackingStart = new Date(AFFILIATE_TRACKING_STARTED_AT).getTime();
  const clampedToTrackingStart = trackingStart > requestedSince;
  const sinceMs = Math.max(requestedSince, trackingStart);
  const since = new Date(sinceMs).toISOString();

  const rows: ClickRow[] = [];

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

  // Product names live only in the content (GearPicks name / inline anchor
  // text), never in the Amazon URL - so resolve them here rather than trusting
  // the anchor text logged at click time, which for a GearPicks button is the
  // shared "View on Amazon" CTA. See lib/affiliate-products.ts.
  const nameMap = getAffiliateProductNames();

  const rowsByDate = new Map<string, ClickRow[]>();
  const pathCounts = new Map<string, number>();
  const placementCounts = new Map<string, number>();

  for (const row of humanRows) {
    const date = row.created_at.slice(0, 10);
    if (!rowsByDate.has(date)) rowsByDate.set(date, []);
    rowsByDate.get(date)!.push(row);

    pathCounts.set(row.path, (pathCounts.get(row.path) ?? 0) + 1);

    const placement = row.placement ?? "unknown";
    placementCounts.set(placement, (placementCounts.get(placement) ?? 0) + 1);
  }

  // Zero-filled, so a day with no clicks reads as a real zero rather than
  // vanishing from the chart - same convention as getPageViewsForPath. Each
  // day carries its own by-page and by-product breakdown so the report can
  // filter to a single day without a second request.
  const byDay: AffiliateClickDay[] = [];
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
      byProduct: buildProducts(dayRows, nameMap),
    });
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
    byProduct: buildProducts(humanRows, nameMap),
    byPlacement: Array.from(placementCounts.entries())
      .map(([placement, clicks]) => ({ placement, clicks }))
      .sort((a, b) => b.clicks - a.clicks),
    botClicks,
  };
}
