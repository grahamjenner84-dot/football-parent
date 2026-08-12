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

export async function logSearchQuery(query: string, resultCount: number): Promise<void> {
  const supabase = adminClient();
  const { error } = await supabase
    .from("search_queries")
    .insert({ query, result_count: resultCount });

  if (error) {
    throw new Error("Failed to insert search_queries row: " + error.message);
  }
}

export interface TopSearchRow {
  query: string;
  count: number;
  zeroResultCount: number;
}

export async function getTopSearches(days: number = 30): Promise<TopSearchRow[]> {
  const supabase = adminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("search_queries")
    .select("query, result_count, created_at")
    .gte("created_at", since);

  if (error) {
    throw new Error("Failed to read search_queries: " + error.message);
  }

  const rows = data ?? [];
  const byQuery = new Map<string, TopSearchRow>();

  for (const row of rows) {
    const key = row.query.trim().toLowerCase();
    if (!key) continue;
    const bucket = byQuery.get(key) ?? { query: key, count: 0, zeroResultCount: 0 };
    bucket.count += 1;
    if (row.result_count === 0) bucket.zeroResultCount += 1;
    byQuery.set(key, bucket);
  }

  return Array.from(byQuery.values()).sort((a, b) => b.count - a.count);
}
