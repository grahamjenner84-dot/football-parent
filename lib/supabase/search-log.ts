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
  lastSeen: string; // YYYY-MM-DD (UTC) of the most recent occurrence
}

export interface SearchLogStats {
  totalSearches: number;
  successfulSearches: number;
  zeroResultSearches: number;
  successRate: number; // 0-1
  // Logged rows that were only a visitor part-way through typing a longer
  // query (see collapseTypingFragments) - excluded from every number above.
  collapsedFragments: number;
  rows: TopSearchRow[];
}

// A logged query is treated as a typing fragment, not a search in its own
// right, when a longer query that starts with it was logged within this
// many milliseconds. The header dropdown used to log after a 600ms pause, so
// one search typed at phone speed produced a chain of prefixes ("who to
// register child's 5", "... 5 yea", "... 5 years", ...), each a few seconds
// apart and each counted as a separate 0-result search. Those rows are
// still in the table; this folds them away at read time so the report shows
// the search the visitor actually finished typing. Two minutes is generous
// for the gap between one logged prefix and the next, while a genuinely
// separate search for a longer term (someone searching "boots", then
// "boots for wide feet" tomorrow) stays separate.
const FRAGMENT_WINDOW_MS = 2 * 60 * 1000;

interface LoggedRow {
  query: string;
  result_count: number;
  created_at: string;
}

export function collapseTypingFragments(rows: LoggedRow[]): {
  kept: LoggedRow[];
  collapsed: number;
} {
  // Oldest first, so "a later row" means a higher index.
  const ordered = rows
    .map((row, i) => ({ row, i, key: row.query.trim().toLowerCase(), at: Date.parse(row.created_at) }))
    .sort((a, b) => a.at - b.at || a.i - b.i);
  const kept: LoggedRow[] = [];
  let collapsed = 0;
  for (let i = 0; i < ordered.length; i++) {
    const current = ordered[i];
    let isFragment = false;
    for (let j = i + 1; j < ordered.length; j++) {
      const later = ordered[j];
      if (later.at - current.at > FRAGMENT_WINDOW_MS) break;
      if (later.key.length > current.key.length && later.key.startsWith(current.key)) {
        isFragment = true;
        break;
      }
    }
    if (isFragment) collapsed += 1;
    else kept.push(current.row);
  }
  return { kept, collapsed };
}

export interface SearchWindow {
  // Rolling window ending now. Ignored when `date` is set.
  days?: number;
  // One specific UTC day (YYYY-MM-DD).
  date?: string;
}

function windowBounds(window: SearchWindow): { since: string; until?: string } {
  if (window.date) {
    const start = new Date(`${window.date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { since: start.toISOString(), until: end.toISOString() };
  }
  const days = window.days && window.days > 0 ? window.days : 30;
  return { since: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() };
}

export async function getTopSearches(window: SearchWindow = { days: 30 }): Promise<SearchLogStats> {
  const supabase = adminClient();
  const { since, until } = windowBounds(window);

  // PostgREST caps a single request at its configured max-rows (1000 by
  // default), silently truncating rather than erroring. Page through with
  // .range() instead, ordered by id (monotonic, unique) so pages don't
  // skip/duplicate rows.
  const loggedRows: LoggedRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let request = supabase
      .from("search_queries")
      .select("query, result_count, created_at")
      .gte("created_at", since);
    if (until) request = request.lt("created_at", until);
    const { data, error } = await request
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error("Failed to read search_queries: " + error.message);
    }

    const batch = data ?? [];
    loggedRows.push(...batch);
    if (batch.length < pageSize) break;
  }

  const { kept: rows, collapsed } = collapseTypingFragments(loggedRows);
  const byQuery = new Map<string, TopSearchRow>();
  let successfulSearches = 0;

  for (const row of rows) {
    const key = row.query.trim().toLowerCase();
    if (!key) continue;
    const day = row.created_at.slice(0, 10);
    const bucket =
      byQuery.get(key) ?? { query: key, count: 0, successCount: 0, zeroResultCount: 0, lastSeen: day };
    bucket.count += 1;
    if (day > bucket.lastSeen) bucket.lastSeen = day;
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
    collapsedFragments: collapsed,
    rows: Array.from(byQuery.values()).sort((a, b) => b.count - a.count),
  };
}
