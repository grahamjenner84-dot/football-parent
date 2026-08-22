import { createClient } from "@supabase/supabase-js";
import { classifyReferrerHost, type SourceGroup } from "@/lib/referrer-sources";

// Server-only client using the service role key, same pattern as
// lib/supabase/cookie-consent.ts - this must never be imported from client
// code.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logPageView(path: string, referrerHost: string | null = null): Promise<void> {
  const supabase = adminClient();
  const { error } = await supabase.from("page_views").insert({ path, referrer_host: referrerHost });

  if (error) {
    throw new Error("Failed to insert page_views row: " + error.message);
  }
}

export interface PageViewDay {
  date: string;
  count: number;
  topPaths: { path: string; count: number }[];
}

export interface SourceCount {
  label: string;
  count: number;
}

export interface SourceGroupCount {
  group: SourceGroup;
  count: number;
  topSources: SourceCount[];
}

export interface PageViewStats {
  totalViews: number;
  byDay: PageViewDay[];
  topPaths: { path: string; count: number }[];
  // Excludes rows classified "Internal" (on-site navigation, not a new
  // visit) - see the classifyReferrerHost comment on why that's a valid
  // proxy for "visits from this source" without needing a session id.
  sourceGroups: SourceGroupCount[];
}

export async function getPageViewStats(days: number = 30): Promise<PageViewStats> {
  const supabase = adminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("page_views")
    .select("path, created_at, referrer_host")
    .gte("created_at", since);

  if (error) {
    throw new Error("Failed to read page_views: " + error.message);
  }

  const rows = data ?? [];
  const byDayPathMap = new Map<string, Map<string, number>>();
  const byPathMap = new Map<string, number>();
  const groupMap = new Map<SourceGroup, Map<string, number>>();

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    const dayBucket = byDayPathMap.get(day) ?? new Map<string, number>();
    dayBucket.set(row.path, (dayBucket.get(row.path) ?? 0) + 1);
    byDayPathMap.set(day, dayBucket);

    byPathMap.set(row.path, (byPathMap.get(row.path) ?? 0) + 1);

    const { group, label } = classifyReferrerHost(row.referrer_host);
    if (group === "Internal") continue;
    const labelBucket = groupMap.get(group) ?? new Map<string, number>();
    labelBucket.set(label, (labelBucket.get(label) ?? 0) + 1);
    groupMap.set(group, labelBucket);
  }

  const byDay: PageViewDay[] = Array.from(byDayPathMap.entries())
    .map(([date, pathCounts]) => {
      const topPaths = Array.from(pathCounts.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count);
      const count = topPaths.reduce((sum, p) => sum + p.count, 0);
      return { date, count, topPaths: topPaths.slice(0, 20) };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const sourceGroups: SourceGroupCount[] = Array.from(groupMap.entries())
    .map(([group, labelCounts]) => {
      const topSources = Array.from(labelCounts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
      const count = topSources.reduce((sum, s) => sum + s.count, 0);
      return { group, count, topSources };
    })
    .sort((a, b) => b.count - a.count);

  return {
    totalViews: rows.length,
    byDay,
    topPaths: Array.from(byPathMap.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50),
    sourceGroups,
  };
}
