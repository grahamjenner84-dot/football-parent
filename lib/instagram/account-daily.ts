import { SupabaseClient } from "@supabase/supabase-js";
import { AccountCredentials } from "./publish-pipeline";
import { getAccountCounts, getAccountInsights, InsightsWithBreakdownResponse } from "./graph-client";

// One row per day for the whole account in instagram_account_daily: the
// follower count, plus the previous UTC day's reach, views, bio-link taps
// and follows/unfollows, split by followers vs non-followers where
// Instagram allows. Daily follower counts are what let a collab be judged
// even when Instagram won't attribute follows to the post itself.
//
// Each request is made on its own and a rejection is recorded in `raw`
// rather than failing the run: Meta 400s a metric or breakdown it doesn't
// support, and which ones it supports has shifted between API versions
// (online_followers may have been withdrawn). `raw` keeps every response so
// what actually comes back can be checked without another code change.

type Raw = Record<string, unknown>;

function total(res: InsightsWithBreakdownResponse | undefined, metric: string): number | null {
  const m = res?.data?.find((d) => d.name === metric);
  const v = m?.total_value?.value ?? m?.values?.[m.values.length - 1]?.value;
  return typeof v === "number" ? v : null;
}

// Value for one dimension value of the first breakdown, e.g. FOLLOWER.
export function breakdownValue(res: InsightsWithBreakdownResponse | undefined, metric: string, dimensionValue: string): number | null {
  const m = res?.data?.find((d) => d.name === metric);
  const results = m?.total_value?.breakdowns?.[0]?.results ?? [];
  const hit = results.find((r) => r.dimension_values?.includes(dimensionValue));
  return hit ? hit.value : results.length ? 0 : null;
}

async function attempt<T>(raw: Raw, key: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    const res = await fn();
    raw[key] = res;
    return res;
  } catch (err) {
    raw[key] = { error: err instanceof Error ? err.message : String(err) };
    return undefined;
  }
}

function isMissingTable(error: { code?: string }): boolean {
  return error.code === "PGRST205" || error.code === "42P01";
}

export async function recordAccountDaily(supabase: SupabaseClient, creds: AccountCredentials, now = new Date()): Promise<{ snapshotDate: string; followers: number | null } | { skipped: string }> {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const until = Math.floor(todayUtc / 1000);
  const since = until - 24 * 60 * 60;
  const snapshotDate = new Date(since * 1000).toISOString().slice(0, 10);
  const { igUserId, accessToken } = creds;
  const day = { period: "day", since, until, metric_type: "total_value" };
  const raw: Raw = {};

  const counts = await attempt(raw, "counts", () => getAccountCounts(igUserId, accessToken));
  const totals = await attempt(raw, "totals", () => getAccountInsights(igUserId, accessToken, { ...day, metric: "reach,views,profile_links_taps" }));
  const reachSplit = await attempt(raw, "reach_by_follow_type", () => getAccountInsights(igUserId, accessToken, { ...day, metric: "reach", breakdown: "follow_type" }));
  const viewsSplit = await attempt(raw, "views_by_follow_type", () => getAccountInsights(igUserId, accessToken, { ...day, metric: "views", breakdown: "follow_type" }));
  const follows = await attempt(raw, "follows_and_unfollows", () => getAccountInsights(igUserId, accessToken, { ...day, metric: "follows_and_unfollows", breakdown: "follow_type" }));
  // Format split (reels vs posts vs stories) is the nearest thing to "where
  // it was seen" the API has offered; kept raw only.
  await attempt(raw, "views_by_media_product_type", () => getAccountInsights(igUserId, accessToken, { ...day, metric: "views", breakdown: "media_product_type" }));
  const online = await attempt(raw, "online_followers", () => getAccountInsights(igUserId, accessToken, { metric: "online_followers", period: "lifetime", since, until }));

  // online_followers' value is an hour -> count map, not a number.
  const onlineValue = online?.data?.find((d) => d.name === "online_followers")?.values?.at(-1)?.value as unknown;

  const row = {
    account_id: creds.accountRowId,
    snapshot_date: snapshotDate,
    followers_count: counts?.followers_count ?? null,
    follows_count: counts?.follows_count ?? null,
    media_count: counts?.media_count ?? null,
    reach: total(totals, "reach"),
    reach_followers: breakdownValue(reachSplit, "reach", "FOLLOWER"),
    reach_non_followers: breakdownValue(reachSplit, "reach", "NON_FOLLOWER"),
    views: total(totals, "views"),
    views_followers: breakdownValue(viewsSplit, "views", "FOLLOWER"),
    views_non_followers: breakdownValue(viewsSplit, "views", "NON_FOLLOWER"),
    profile_links_taps: total(totals, "profile_links_taps"),
    // follows_and_unfollows splits by follow_type: FOLLOWER = new follows,
    // NON_FOLLOWER = unfollows.
    follows: breakdownValue(follows, "follows_and_unfollows", "FOLLOWER"),
    unfollows: breakdownValue(follows, "follows_and_unfollows", "NON_FOLLOWER"),
    online_followers: onlineValue && typeof onlineValue === "object" ? onlineValue : null,
    raw,
    pulled_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("instagram_account_daily").upsert(row, { onConflict: "account_id,snapshot_date" });
  if (error) {
    if (isMissingTable(error)) return { skipped: "instagram_account_daily table missing (apply 20261008090000_post_metrics_follows.sql)" };
    throw new Error(`Failed to record account daily snapshot: ${error.message}`);
  }
  return { snapshotDate, followers: row.followers_count };
}
