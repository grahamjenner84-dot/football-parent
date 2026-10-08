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

const DAY_SECONDS = 24 * 60 * 60;
// Instagram lets a day's account insights be read afterwards, so missing
// days are filled in: up to BACKFILL_PER_RUN per night, newest first, looking
// back BACKFILL_DAYS. A day counts as missing if it has no row, or its row
// got neither reach nor views (e.g. Instagram was down, or the token had
// expired), so it is retried. followers_count stays null on filled-in days:
// Instagram only ever gives the current count.
const BACKFILL_DAYS = 30;
const BACKFILL_PER_RUN = 5;

function dateOf(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

// The insight numbers for one UTC day. `withExtras` adds the requests that
// only make sense for yesterday (follower counts are "now"; online_followers
// isn't a per-day figure).
async function dayRow(creds: AccountCredentials, since: number, withExtras: boolean) {
  const { igUserId, accessToken } = creds;
  const day = { period: "day", since, until: since + DAY_SECONDS, metric_type: "total_value" };
  const raw: Raw = {};

  const counts = withExtras ? await attempt(raw, "counts", () => getAccountCounts(igUserId, accessToken)) : undefined;
  const totals = await attempt(raw, "totals", () => getAccountInsights(igUserId, accessToken, { ...day, metric: "reach,views,profile_links_taps" }));
  const reachSplit = await attempt(raw, "reach_by_follow_type", () => getAccountInsights(igUserId, accessToken, { ...day, metric: "reach", breakdown: "follow_type" }));
  const viewsSplit = await attempt(raw, "views_by_follow_type", () => getAccountInsights(igUserId, accessToken, { ...day, metric: "views", breakdown: "follow_type" }));
  const follows = await attempt(raw, "follows_and_unfollows", () => getAccountInsights(igUserId, accessToken, { ...day, metric: "follows_and_unfollows", breakdown: "follow_type" }));
  let onlineValue: unknown = null;
  if (withExtras) {
    // Format split (reels vs posts vs stories) is the nearest thing to
    // "where it was seen" the API has offered; kept raw only.
    await attempt(raw, "views_by_media_product_type", () => getAccountInsights(igUserId, accessToken, { ...day, metric: "views", breakdown: "media_product_type" }));
    const online = await attempt(raw, "online_followers", () => getAccountInsights(igUserId, accessToken, { metric: "online_followers", period: "lifetime", since, until: since + DAY_SECONDS }));
    // online_followers' value is an hour -> count map, not a number.
    onlineValue = online?.data?.find((d) => d.name === "online_followers")?.values?.at(-1)?.value as unknown;
  }

  return {
    account_id: creds.accountRowId,
    snapshot_date: dateOf(since),
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
}

export type AccountDailyResult = { snapshotDate: string; followers: number | null; backfilled: string[] } | { skipped: string };

export async function recordAccountDaily(supabase: SupabaseClient, creds: AccountCredentials, now = new Date()): Promise<AccountDailyResult> {
  const todayUtc = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);
  const yesterday = todayUtc - DAY_SECONDS;
  const earliest = todayUtc - BACKFILL_DAYS * DAY_SECONDS;

  // Which recent days already have usable numbers.
  const { data: existing, error: readError } = await supabase
    .from("instagram_account_daily")
    .select("snapshot_date, reach, views")
    .eq("account_id", creds.accountRowId)
    .gte("snapshot_date", dateOf(earliest));
  if (readError) {
    if (isMissingTable(readError)) return { skipped: "instagram_account_daily table missing (apply 20261008090000_post_metrics_follows.sql)" };
    throw new Error(`Failed to read account daily snapshots: ${readError.message}`);
  }
  const done = new Set((existing ?? []).filter((r) => r.reach != null || r.views != null).map((r) => r.snapshot_date as string));

  const upsert = async (row: Record<string, unknown>) => {
    const { error } = await supabase.from("instagram_account_daily").upsert(row, { onConflict: "account_id,snapshot_date" });
    if (error) throw new Error(`Failed to record account daily snapshot for ${row.snapshot_date}: ${error.message}`);
  };

  // Yesterday always (it carries the follower count, which can't be had later).
  const latest = await dayRow(creds, yesterday, true);
  await upsert(latest);

  // Then fill gaps, newest first. A filled-in day is only written if it got
  // numbers, so a day Instagram won't answer for stays missing and is retried.
  // Attempts are capped too, so a run of days Instagram won't answer for
  // can't use up the cron's time limit.
  const backfilled: string[] = [];
  let tried = 0;
  for (let d = yesterday - DAY_SECONDS; d >= earliest && tried < BACKFILL_PER_RUN; d -= DAY_SECONDS) {
    if (done.has(dateOf(d))) continue;
    tried++;
    const row = await dayRow(creds, d, false);
    if (row.reach == null && row.views == null) continue;
    await upsert(row);
    backfilled.push(row.snapshot_date);
  }

  return { snapshotDate: latest.snapshot_date, followers: latest.followers_count, backfilled };
}
