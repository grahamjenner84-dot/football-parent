import { createClient } from "@supabase/supabase-js";
import { matchesKnownBotPattern } from "@/lib/user-agent-bots";

// Server-only client using the service role key, same pattern as
// lib/supabase/partner-clicks.ts - this must never be imported from client
// code.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** How the share went: see the method column comment in the
 * coach_app_shares migration. */
export const SHARE_METHODS = ["share-sheet", "share-cancelled", "clipboard", "email"] as const;
export type ShareMethod = (typeof SHARE_METHODS)[number];

/** utm_source on the link the share button sends, set in
 * app/components/CoachAppShareButton.tsx. A page view carrying it is a coach
 * (or whoever) opening what a parent sent them. */
export const SHARED_LINK_UTM_SOURCE = "parent-share";

// When share tracking went live. Nothing before this can exist in
// coach_app_shares, and the shared link didn't exist either.
export const SHARE_TRACKING_STARTED_AT = "2026-09-25T00:00:00Z";

const FLOOD_WINDOW_MS = 60_000;
// Same order as partner_clicks: a parent can't meaningfully share the same
// article ten times a minute.
const FLOOD_THRESHOLD = 10;

async function recentlyFlooded(supabase: ReturnType<typeof adminClient>, path: string): Promise<boolean> {
  const since = new Date(Date.now() - FLOOD_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("coach_app_shares")
    .select("id", { count: "exact", head: true })
    .eq("path", path)
    .gte("created_at", since);
  if (error) return false;
  return (count ?? 0) >= FLOOD_THRESHOLD;
}

export async function logCoachAppShare(
  path: string,
  bannerVariant: string,
  method: ShareMethod,
  userAgent: string | null
): Promise<void> {
  const supabase = adminClient();
  if (await recentlyFlooded(supabase, path)) return;

  const { error } = await supabase.from("coach_app_shares").insert({
    path,
    banner_variant: bannerVariant,
    method,
    user_agent: userAgent,
  });
  if (error) {
    throw new Error("Failed to insert coach_app_shares row: " + error.message);
  }
}

export interface ShareCount {
  key: string;
  count: number;
}

export interface ShareDay {
  date: string;
  /** Share-sheet completions plus clipboard and email: a link actually sent
   * or copied. Cancelled share sheets are counted separately. */
  shares: number;
  cancelled: number;
  sharedLinkVisits: number;
}

export interface CoachAppShareStats {
  days: number;
  since: string;
  /** Every tap on the button, whatever happened next. */
  taps: number;
  /** Taps that ended with a link sent or copied (not cancelled). */
  shares: number;
  cancelled: number;
  byMethod: ShareCount[];
  byPath: ShareCount[];
  byVariant: ShareCount[];
  /** Page views carrying utm_source=parent-share: someone opening a shared
   * link. Counts every page they then land on with it, which in practice is
   * the Coach App landing page. */
  sharedLinkVisits: number;
  /** sharedLinkVisits / shares. Can exceed 1 if one link is opened by
   * several people (a coach forwarding it to the assistant). */
  visitsPerShare: number | null;
  byDay: ShareDay[];
  botRows: number;
}

function tally(values: string[]): ShareCount[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

async function readAll<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to read ${label}: ${error.message}`);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

export async function getCoachAppShareStats(days: number = 30): Promise<CoachAppShareStats> {
  const supabase = adminClient();
  const sinceMs = Math.max(
    Date.now() - days * 24 * 60 * 60 * 1000,
    new Date(SHARE_TRACKING_STARTED_AT).getTime()
  );
  const since = new Date(sinceMs).toISOString();

  type TapRow = { path: string; banner_variant: string; method: string; user_agent: string | null; created_at: string };
  type VisitRow = { user_agent: string | null; created_at: string };

  const [tapRows, visitRows] = await Promise.all([
    readAll<TapRow>(
      (from, to) =>
        supabase
          .from("coach_app_shares")
          .select("path, banner_variant, method, user_agent, created_at")
          .gte("created_at", since)
          .order("id", { ascending: true })
          .range(from, to),
      "coach_app_shares"
    ),
    readAll<VisitRow>(
      (from, to) =>
        supabase
          .from("page_views")
          .select("user_agent, created_at")
          .eq("utm_source", SHARED_LINK_UTM_SOURCE)
          .gte("created_at", since)
          .order("id", { ascending: true })
          .range(from, to),
      "page_views (shared-link visits)"
    ),
  ]);

  const isHuman = (ua: string | null) => !ua || !matchesKnownBotPattern(ua);
  const taps = tapRows.filter((r) => isHuman(r.user_agent));
  const visits = visitRows.filter((r) => isHuman(r.user_agent));

  const cancelled = taps.filter((r) => r.method === "share-cancelled").length;
  const shares = taps.length - cancelled;

  const dayMap = new Map<string, ShareDay>();
  const day = (iso: string) => {
    const date = iso.slice(0, 10);
    let d = dayMap.get(date);
    if (!d) {
      d = { date, shares: 0, cancelled: 0, sharedLinkVisits: 0 };
      dayMap.set(date, d);
    }
    return d;
  };
  for (const r of taps) {
    if (r.method === "share-cancelled") day(r.created_at).cancelled++;
    else day(r.created_at).shares++;
  }
  for (const r of visits) day(r.created_at).sharedLinkVisits++;

  return {
    days,
    since,
    taps: taps.length,
    shares,
    cancelled,
    byMethod: tally(taps.map((r) => r.method)),
    byPath: tally(taps.map((r) => r.path)),
    byVariant: tally(taps.map((r) => r.banner_variant)),
    sharedLinkVisits: visits.length,
    visitsPerShare: shares > 0 ? visits.length / shares : null,
    byDay: Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
    botRows: tapRows.length - taps.length + (visitRows.length - visits.length),
  };
}
