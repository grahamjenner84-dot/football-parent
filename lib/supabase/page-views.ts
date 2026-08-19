import { createClient } from "@supabase/supabase-js";

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

export async function logPageView(path: string): Promise<void> {
  const supabase = adminClient();
  const { error } = await supabase.from("page_views").insert({ path });

  if (error) {
    throw new Error("Failed to insert page_views row: " + error.message);
  }
}

export interface PageViewStats {
  totalViews: number;
  byDay: { date: string; count: number }[];
  topPaths: { path: string; count: number }[];
}

export async function getPageViewStats(days: number = 30): Promise<PageViewStats> {
  const supabase = adminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("page_views")
    .select("path, created_at")
    .gte("created_at", since);

  if (error) {
    throw new Error("Failed to read page_views: " + error.message);
  }

  const rows = data ?? [];
  const byDayMap = new Map<string, number>();
  const byPathMap = new Map<string, number>();

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
    byPathMap.set(row.path, (byPathMap.get(row.path) ?? 0) + 1);
  }

  return {
    totalViews: rows.length,
    byDay: Array.from(byDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    topPaths: Array.from(byPathMap.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50),
  };
}
