import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key, same pattern as
// lib/supabase/content-queue.ts - this must never be imported from client
// code.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export type ConsentAction =
  | "banner_shown"
  | "accept_all"
  | "reject_all"
  | "save_preferences";

export async function logConsentEvent(
  action: ConsentAction,
  analyticsGranted: boolean
): Promise<void> {
  const supabase = adminClient();
  const { error } = await supabase
    .from("cookie_consent_events")
    .insert({ action, analytics_granted: analyticsGranted });

  if (error) {
    throw new Error("Failed to insert cookie_consent_events row: " + error.message);
  }
}

export interface ConsentStats {
  bannerShown: number;
  totalDecisions: number;
  acceptAll: number;
  rejectAll: number;
  savePreferences: number;
  analyticsGrantedCount: number;
  analyticsGrantedRate: number; // 0-1, share of decisions (not shows) that ended up granted
  byDay: {
    date: string;
    bannerShown: number;
    acceptAll: number;
    rejectAll: number;
    savePreferences: number;
  }[];
}

export async function getConsentStats(days: number = 30): Promise<ConsentStats> {
  const supabase = adminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // PostgREST caps a single request at its configured max-rows (1000 by
  // default), silently truncating rather than erroring. Page through with
  // .range() instead, ordered by id (monotonic, unique) so pages don't
  // skip/duplicate rows.
  const rows: { action: string; analytics_granted: boolean; created_at: string }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("cookie_consent_events")
      .select("action, analytics_granted, created_at")
      .gte("created_at", since)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error("Failed to read cookie_consent_events: " + error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  const byDayMap = new Map<
    string,
    { bannerShown: number; acceptAll: number; rejectAll: number; savePreferences: number }
  >();

  let bannerShown = 0;
  let acceptAll = 0;
  let rejectAll = 0;
  let savePreferences = 0;
  let analyticsGrantedCount = 0;

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    const bucket = byDayMap.get(day) ?? {
      bannerShown: 0,
      acceptAll: 0,
      rejectAll: 0,
      savePreferences: 0,
    };

    if (row.action === "banner_shown") {
      bannerShown += 1;
      bucket.bannerShown += 1;
    } else if (row.action === "accept_all") {
      acceptAll += 1;
      bucket.acceptAll += 1;
      if (row.analytics_granted) analyticsGrantedCount += 1;
    } else if (row.action === "reject_all") {
      rejectAll += 1;
      bucket.rejectAll += 1;
      if (row.analytics_granted) analyticsGrantedCount += 1;
    } else {
      savePreferences += 1;
      bucket.savePreferences += 1;
      if (row.analytics_granted) analyticsGrantedCount += 1;
    }

    byDayMap.set(day, bucket);
  }

  const totalDecisions = acceptAll + rejectAll + savePreferences;

  return {
    bannerShown,
    totalDecisions,
    acceptAll,
    rejectAll,
    savePreferences,
    analyticsGrantedCount,
    analyticsGrantedRate: totalDecisions > 0 ? analyticsGrantedCount / totalDecisions : 0,
    byDay: Array.from(byDayMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}
