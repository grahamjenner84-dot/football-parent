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

export type ConsentAction = "accept_all" | "reject_all" | "save_preferences";

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
  totalEvents: number;
  acceptAll: number;
  rejectAll: number;
  savePreferences: number;
  analyticsGrantedCount: number;
  analyticsGrantedRate: number; // 0-1, share of all events that ended up granted
  byDay: { date: string; acceptAll: number; rejectAll: number; savePreferences: number }[];
}

export async function getConsentStats(days: number = 30): Promise<ConsentStats> {
  const supabase = adminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("cookie_consent_events")
    .select("action, analytics_granted, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Failed to read cookie_consent_events: " + error.message);
  }

  const rows = data ?? [];
  const byDayMap = new Map<
    string,
    { acceptAll: number; rejectAll: number; savePreferences: number }
  >();

  let acceptAll = 0;
  let rejectAll = 0;
  let savePreferences = 0;
  let analyticsGrantedCount = 0;

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    const bucket = byDayMap.get(day) ?? {
      acceptAll: 0,
      rejectAll: 0,
      savePreferences: 0,
    };

    if (row.action === "accept_all") {
      acceptAll += 1;
      bucket.acceptAll += 1;
    } else if (row.action === "reject_all") {
      rejectAll += 1;
      bucket.rejectAll += 1;
    } else {
      savePreferences += 1;
      bucket.savePreferences += 1;
    }

    if (row.analytics_granted) analyticsGrantedCount += 1;
    byDayMap.set(day, bucket);
  }

  const totalEvents = rows.length;

  return {
    totalEvents,
    acceptAll,
    rejectAll,
    savePreferences,
    analyticsGrantedCount,
    analyticsGrantedRate: totalEvents > 0 ? analyticsGrantedCount / totalEvents : 0,
    byDay: Array.from(byDayMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}
