import { SupabaseClient } from "@supabase/supabase-js";
import { getMediaInsights, getMediaInsightBreakdown, withRetry, isTransientError, IgApiError, MediaInsightsResponse } from "./graph-client";
import { breakdownValue } from "./account-daily";
import { AccountCredentials } from "./publish-pipeline";
import { DuePull, metricAttemptsForFormat, BREAKDOWN_PROBES, parseInsightsResponse, buildMetricsRow, buildErrorRow, recordMetricsPull } from "./insights-pipeline";

export interface InsightsPullOutcome {
  postId: string;
  window: string;
  outcome: "pulled" | "deferred" | "failed";
  error?: string;
}

export async function pullInsightsForPost(supabase: SupabaseClient, due: DuePull, creds: AccountCredentials): Promise<InsightsPullOutcome> {
  const { post, window } = due;
  const mediaId = post.ig_media_id as string; // guaranteed non-null by getDueInsightsPulls' query filter
  const attempts = metricAttemptsForFormat(post.format);

  try {
    // Richest metric list first; on a 400 (a metric this media type doesn't
    // support) step down to the next, so the post always gets at least its
    // reach and engagement numbers.
    let response: MediaInsightsResponse | undefined;
    for (let i = 0; i < attempts.length && !response; i++) {
      try {
        response = await withRetry(() => getMediaInsights(mediaId, creds.accessToken, attempts[i]));
      } catch (err) {
        const last = i === attempts.length - 1;
        if (last || !(err instanceof IgApiError) || isTransientError(err) || err.httpStatus !== 400) throw err;
        console.warn(`[insights] post ${post.id}: metrics rejected (${err.message}), trying a shorter list`);
      }
    }
    const row = buildMetricsRow(post.id, window.label, post.format, parseInsightsResponse(response as MediaInsightsResponse));

    // Breakdowns, one request each; a rejection only loses that number.
    const extra: Record<string, unknown> = {};
    for (const probe of BREAKDOWN_PROBES) {
      const key = `${probe.metric}_by_${probe.breakdown}`;
      try {
        const res = await getMediaInsightBreakdown(mediaId, creds.accessToken, probe.metric, probe.breakdown);
        extra[key] = res;
        if (probe.metric === "profile_activity") {
          const total = res.data?.find((d) => d.name === "profile_activity")?.total_value?.value;
          row.profile_activity = typeof total === "number" ? total : null;
          row.bio_link_taps = breakdownValue(res, "profile_activity", "BIO_LINK_CLICKED");
        } else {
          row.reach_followers = breakdownValue(res, "reach", "FOLLOWER");
          row.reach_non_followers = breakdownValue(res, "reach", "NON_FOLLOWER");
        }
      } catch (err) {
        extra[key] = { error: err instanceof Error ? err.message : String(err) };
      }
    }
    row.extra = extra;

    await recordMetricsPull(supabase, row);
    return { postId: post.id, window: window.label, outcome: "pulled" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Same reasoning as Phase B's publish-flow: a transient/outage error
    // that survived withRetry's backoff means an ongoing outage, not a
    // fluke. No row is written, so this window stays 'due' and the next
    // scheduled run retries it automatically - it must NOT be treated as a
    // permanent failure just because Meta happened to be down when we
    // checked.
    if (isTransientError(err)) {
      console.warn(`[deferred] post ${post.id} window ${window.label}: transient/platform error, will retry next run: ${message}`);
      return { postId: post.id, window: window.label, outcome: "deferred", error: message };
    }

    // Non-transient (bad metric request, deleted media, etc.) - write a
    // terminal marker row so this window stops being retried every run.
    console.error(`[FAILED] post ${post.id} window ${window.label}: ${message}`);
    await recordMetricsPull(supabase, buildErrorRow(post.id, window.label, message));
    return { postId: post.id, window: window.label, outcome: "failed", error: message };
  }
}

export interface InsightsBatchSummary {
  pulled: number;
  deferred: number;
  failed: number;
  results: InsightsPullOutcome[];
}

export async function runInsightsBatch(supabase: SupabaseClient, dues: DuePull[], creds: AccountCredentials): Promise<InsightsBatchSummary> {
  const summary: InsightsBatchSummary = { pulled: 0, deferred: 0, failed: 0, results: [] };

  for (const due of dues) {
    const outcome = await pullInsightsForPost(supabase, due, creds);
    summary.results.push(outcome);
    if (outcome.outcome === "pulled") {
      summary.pulled++;
      console.log(`[pulled] post ${outcome.postId} window ${outcome.window}`);
    } else if (outcome.outcome === "deferred") {
      summary.deferred++;
    } else {
      summary.failed++;
    }
  }

  return summary;
}
