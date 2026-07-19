import { SupabaseClient } from "@supabase/supabase-js";
import { getMediaInsights, withRetry, isTransientError } from "./graph-client";
import { AccountCredentials } from "./publish-pipeline";
import { DuePull, metricsForFormat, parseInsightsResponse, buildMetricsRow, buildErrorRow, recordMetricsPull } from "./insights-pipeline";

export interface InsightsPullOutcome {
  postId: string;
  window: string;
  outcome: "pulled" | "deferred" | "failed";
  error?: string;
}

export async function pullInsightsForPost(supabase: SupabaseClient, due: DuePull, creds: AccountCredentials): Promise<InsightsPullOutcome> {
  const { post, window } = due;
  const mediaId = post.ig_media_id as string; // guaranteed non-null by getDueInsightsPulls' query filter
  const metrics = metricsForFormat(post.format);

  try {
    const response = await withRetry(() => getMediaInsights(mediaId, creds.accessToken, metrics));
    const raw = parseInsightsResponse(response);
    await recordMetricsPull(supabase, buildMetricsRow(post.id, window.label, post.format, raw));
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
