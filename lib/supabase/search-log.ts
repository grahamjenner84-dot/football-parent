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
  successCount: number;
  zeroResultCount: number;
}

export interface SearchLogStats {
  totalSearches: number;
  successfulSearches: number;
  zeroResultSearches: number;
  successRate: number; // 0-1
  rows: TopSearchRow[];
}

export async function getTopSearches(days: number = 30): Promise<SearchLogStats> {
  const supabase = adminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // PostgREST caps a single request at its configured max-rows (1000 by
  // default), silently truncating rather than erroring. Page through with
  // .range() instead, ordered by id (monotonic, unique) so pages don't
  // skip/duplicate rows.
  const rows: { query: string; result_count: number; created_at: string }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("search_queries")
      .select("query, result_count, created_at")
      .gte("created_at", since)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error("Failed to read search_queries: " + error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  const byQuery = new Map<string, TopSearchRow>();
  let successfulSearches = 0;

  for (const row of rows) {
    const key = row.query.trim().toLowerCase();
    if (!key) continue;
    const bucket =
      byQuery.get(key) ?? { query: key, count: 0, successCount: 0, zeroResultCount: 0 };
    bucket.count += 1;
    if (row.result_count > 0) {
      bucket.successCount += 1;
      successfulSearches += 1;
    } else {
      bucket.zeroResultCount += 1;
    }
    byQuery.set(key, bucket);
  }

  const totalSearches = rows.length;

  return {
    totalSearches,
    successfulSearches,
    zeroResultSearches: totalSearches - successfulSearches,
    successRate: totalSearches > 0 ? successfulSearches / totalSearches : 0,
    rows: Array.from(byQuery.values()).sort((a, b) => b.count - a.count),
  };
}
