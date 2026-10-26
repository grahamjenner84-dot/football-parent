// Meta's link scanner. When links to the site appear on Facebook (a post
// going out, a page edit, a link preview being refreshed), Meta fetches each
// of them from US servers in a full browser that passes itself off as
// ordinary desktop Firefox/Chrome or iPhone Safari, with facebook.com as the
// referrer. It runs the page's JavaScript, so every fetch lands in
// page_views as a real-looking Social view, and the pages' form "view" steps
// fire too.
//
// On 2026-10-26 one such scan was the whole of the day's Facebook traffic:
// 22 rows between 10:18 and 10:19 UK across six pages (four interviews, the
// Coach App page, /progress) and their form steps. One "iPhone" opened five
// pages inside three seconds and the same five again 20 seconds later, next
// to a "Firefox/59.0" whose rv:58.0 doesn't match its own version. It made
// 3 of that day's 4 Coach App page views and 3 of its 4 sign-up form views.
//
// No user-agent signature catches it (lib/user-agent-bots.ts): the strings
// are ordinary, and any one row looks like someone on desktop Facebook
// clicking a link. The shape gives it away. A real reader arrives from
// Facebook on one page, and every further page of their visit has this site
// as its referrer, so several different pages arriving from Facebook within
// seconds of each other takes several separate people landing at once on
// different pages, which at this site's traffic doesn't happen. People
// reading inside the Facebook or Instagram app are never candidates: the
// in-app browser names itself (FBAN/FBAV/FB_IAB/Instagram), the scanner
// doesn't.
//
// Read-time only, like the other bot rules in lib/supabase/page-views.ts:
// page_views keeps every row, and flagged rows are reported as bot views
// rather than vanishing.

// Matched as the host itself or any subdomain (www., m., l., lm.), the same
// way lib/referrer-sources.ts matches. Instagram is Meta's too and is
// included on the same reasoning, though only Facebook scans have been seen.
const META_REFERRER_HOSTS = ["facebook.com", "instagram.com"];

// What Facebook's and Instagram's own in-app browsers add to the user agent.
const META_IN_APP_UA = /FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram/i;

// Candidate rows further apart than this start a new cluster. The 26 Oct
// scan's longest gap between rows was 21 seconds.
export const META_SCAN_MAX_GAP_MS = 60_000;

// Distinct pages a cluster has to reach to count as a scan. Form step events
// ride along with their page and don't count as extra pages. The 26 Oct scan
// reached six; one real reader is one page.
export const META_SCAN_MIN_PAGES = 4;

export interface MetaScanRow {
  created_at: string;
  referrer_host: string | null;
  user_agent: string | null;
}

// A scan's first and last row, as epoch milliseconds.
export interface MetaScanBurst {
  from: number;
  to: number;
}

function isMetaReferrer(referrerHost: string | null): boolean {
  if (!referrerHost) return false;
  const host = referrerHost.toLowerCase().trim();
  return META_REFERRER_HOSTS.some((known) => host === known || host.endsWith(`.${known}`));
}

// Arrived from Facebook or Instagram, in a browser that isn't their app.
export function isMetaScanCandidate(row: MetaScanRow): boolean {
  return isMetaReferrer(row.referrer_host) && !(row.user_agent && META_IN_APP_UA.test(row.user_agent));
}

// Every scan in `rows`. Needs rows from every path, not one page's: a scan is
// only recognisable by how many pages it touched. `isEventPath` marks the
// synthetic step events (form views and the like) that mustn't count as
// pages of their own.
export function findMetaScanBursts(
  rows: (MetaScanRow & { path: string })[],
  isEventPath: (path: string) => boolean
): MetaScanBurst[] {
  const candidates = rows
    .filter(isMetaScanCandidate)
    .map((row) => ({ at: Date.parse(row.created_at), path: row.path }))
    .sort((a, b) => a.at - b.at);

  const bursts: MetaScanBurst[] = [];
  let cluster: typeof candidates = [];
  const closeCluster = () => {
    const pages = new Set(cluster.filter((c) => !isEventPath(c.path)).map((c) => c.path));
    if (pages.size >= META_SCAN_MIN_PAGES) {
      bursts.push({ from: cluster[0].at, to: cluster[cluster.length - 1].at });
    }
    cluster = [];
  };

  for (const candidate of candidates) {
    if (cluster.length > 0 && candidate.at - cluster[cluster.length - 1].at > META_SCAN_MAX_GAP_MS) {
      closeCluster();
    }
    cluster.push(candidate);
  }
  if (cluster.length > 0) closeCluster();

  return bursts;
}

export function isMetaScanRow(row: MetaScanRow, bursts: MetaScanBurst[]): boolean {
  if (bursts.length === 0 || !isMetaScanCandidate(row)) return false;
  const at = Date.parse(row.created_at);
  return bursts.some((burst) => at >= burst.from && at <= burst.to);
}
