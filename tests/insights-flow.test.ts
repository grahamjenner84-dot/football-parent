import "./helpers/env-setup"; // must run before graph-client.ts's withRetry is imported - sets a fast retry base delay
import { test } from "node:test";
import assert from "node:assert/strict";
import { installMockFetch } from "./helpers/mock-fetch";
import { makePost, fakeCreds, createFakeInsightsSupabase } from "./helpers/fixtures";
import { getDueInsightsPulls, getDueRefreshPulls, metricAttemptsForFormat, BREAKDOWN_PROBES, type DuePull } from "../lib/instagram/insights-pipeline";
import { pullInsightsForPost, runInsightsBatch } from "../lib/instagram/insights-flow";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function ok(body: unknown) {
  return { status: 200, body };
}
function err(status: number, code: number, message: string) {
  return { status, body: { error: { code, message } } };
}

const carouselInsights = ok({
  data: [
    { name: "reach", values: [{ value: 500 }] },
    { name: "likes", values: [{ value: 40 }] },
    { name: "comments", values: [{ value: 3 }] },
    { name: "saved", values: [{ value: 12 }] },
    { name: "shares", values: [{ value: 2 }] },
    { name: "total_interactions", total_value: { value: 57 } },
  ],
});

const reelInsights = ok({
  data: [
    { name: "reach", values: [{ value: 9000 }] },
    { name: "views", values: [{ value: 15000 }] },
    { name: "likes", values: [{ value: 300 }] },
    { name: "comments", values: [{ value: 20 }] },
    { name: "saved", values: [{ value: 80 }] },
    { name: "shares", values: [{ value: 45 }] },
    { name: "total_interactions", total_value: { value: 445 } },
    { name: "ig_reels_avg_watch_time", values: [{ value: 6400 }] }, // milliseconds, per the real API's own field title
  ],
});

// A breakdown probe's answer with nothing in it: the probe's numbers stay null.
const emptyBreakdown = ok({ data: [] });

// Everything one successful pull asks Meta for, in order: the insights
// request, then one request per breakdown probe (see pullInsightsForPost).
function pullResponses(due: DuePull) {
  return [due.post.format === "reel" ? reelInsights : carouselInsights, ...BREAKDOWN_PROBES.map(() => emptyBreakdown)];
}

test("carousel: a due pull writes reach/likes/comments/saves/shares/total_interactions - no impressions, no watch time", async () => {
  const post = makePost({ id: "p1", format: "carousel", status: "published", ig_media_id: "ig-media-1", published_at: hoursAgo(61) });
  const { client, upsertCalls } = createFakeInsightsSupabase({ posts: [post] });
  const mock = installMockFetch([carouselInsights]);

  try {
    const due = await getDueInsightsPulls(client);
    assert.equal(due.length, 1);
    const outcome = await pullInsightsForPost(client, due[0], fakeCreds);

    assert.equal(outcome.outcome, "pulled");
    assert.equal(upsertCalls.length, 1);
    const row = upsertCalls[0];
    assert.equal(row.reach, 500);
    assert.equal(row.saves, 12, "Meta's 'saved' metric name must map to the 'saves' column");
    assert.equal(row.total_interactions, 57);
    assert.equal(row.views, null);
    assert.equal(row.avg_watch_time_sec, null);
    assert.equal("impressions" in row, false, "must never write the retired impressions metric");

    // Request itself must not ask Meta for impressions/watch-time either.
    assert.match(mock.calls[0].url, /metric=reach%2Clikes%2Ccomments%2Csaved%2Cshares%2Ctotal_interactions/);
  } finally {
    mock.restore();
  }
});

test("reel: a due pull includes views + ig_reels_avg_watch_time -> avg_watch_time_sec", async () => {
  const post = makePost({ id: "p1", format: "reel", status: "published", ig_media_id: "ig-media-reel-1", published_at: hoursAgo(61) });
  const { client, upsertCalls } = createFakeInsightsSupabase({ posts: [post] });
  const mock = installMockFetch([reelInsights]);

  try {
    const due = await getDueInsightsPulls(client);
    const outcome = await pullInsightsForPost(client, due[0], fakeCreds);

    assert.equal(outcome.outcome, "pulled");
    const row = upsertCalls[0];
    assert.equal(row.views, 15000);
    assert.equal(row.avg_watch_time_sec, 6.4, "6400ms from Meta must be stored as 6.4s");
    assert.match(mock.calls[0].url, /ig_reels_avg_watch_time/);
  } finally {
    mock.restore();
  }
});

test("a platform outage (HTTP 500, code 1 - the exact shape hit for real on 2026-07-19) is deferred: no row written, still due next run", async () => {
  const post = makePost({ id: "p1", format: "carousel", status: "published", ig_media_id: "ig-media-1", published_at: hoursAgo(61) });
  const { client, upsertCalls, state } = createFakeInsightsSupabase({ posts: [post] });
  const mock = installMockFetch([
    err(500, 1, "An unknown error occurred"),
    err(500, 1, "An unknown error occurred"),
    err(500, 1, "An unknown error occurred"),
    err(500, 1, "An unknown error occurred"), // withRetry default retries=3 -> 4 attempts total
  ]);

  try {
    const due = await getDueInsightsPulls(client);
    const outcome = await pullInsightsForPost(client, due[0], fakeCreds);

    assert.equal(outcome.outcome, "deferred");
    assert.equal(upsertCalls.length, 0, "an outage must not write any post_metrics row");
    assert.equal(state.postMetrics.length, 0);

    // Simulate the next cron tick: still due, because no row exists.
    const dueAgain = await getDueInsightsPulls(client);
    assert.equal(dueAgain.length, 1);
    assert.equal(dueAgain[0].window.label, "initial");
  } finally {
    mock.restore();
  }
});

test("a rejected metric list steps down to a shorter one and still records the post's numbers", async () => {
  const post = makePost({ id: "p1", format: "carousel", status: "published", ig_media_id: "ig-media-1", published_at: hoursAgo(61) });
  const { client, upsertCalls } = createFakeInsightsSupabase({ posts: [post] });
  const mock = installMockFetch([
    err(400, 100, "Invalid metric for this media type"),
    carouselInsights,
    ...BREAKDOWN_PROBES.map(() => emptyBreakdown),
  ]);

  try {
    const due = await getDueInsightsPulls(client);
    const outcome = await pullInsightsForPost(client, due[0], fakeCreds);

    assert.equal(outcome.outcome, "pulled");
    assert.equal(upsertCalls.length, 1);
    assert.equal(upsertCalls[0].reach, 500);
    assert.equal(upsertCalls[0].pull_error ?? null, null);
    assert.match(mock.calls[0].url, /follows/, "the first request asks for the richest list");
    assert.doesNotMatch(mock.calls[1].url, /follows/, "the retry drops the extras");
  } finally {
    mock.restore();
  }
});

test("a non-transient error (bad metric request) is marked failed with a terminal pull_error row - not retried forever", async () => {
  const post = makePost({ id: "p1", format: "carousel", status: "published", ig_media_id: "ig-media-1", published_at: hoursAgo(61) });
  const { client, upsertCalls } = createFakeInsightsSupabase({ posts: [post] });
  // Rejected at every step down, the shortest list included.
  const attempts = metricAttemptsForFormat("carousel").length;
  const mock = installMockFetch(Array.from({ length: attempts }, () => err(400, 100, "Invalid metric for this media type")));

  try {
    const due = await getDueInsightsPulls(client);
    const outcome = await pullInsightsForPost(client, due[0], fakeCreds);

    assert.equal(outcome.outcome, "failed");
    assert.equal(mock.calls.length, attempts, "each shorter list is tried once, and no breakdown probes follow a failure");
    assert.equal(upsertCalls.length, 1);
    assert.match(String(upsertCalls[0].pull_error), /Invalid metric/);

    // Must NOT be retried on the next run - the terminal marker row stops it.
    const dueAgain = await getDueInsightsPulls(client);
    assert.equal(dueAgain.length, 0);
  } finally {
    mock.restore();
  }
});

test("runInsightsBatch: idempotent across two consecutive runs - the second makes zero network calls once everything due is pulled", async () => {
  const post = makePost({ id: "p1", format: "carousel", status: "published", ig_media_id: "ig-media-1", published_at: hoursAgo(61) });
  const { client } = createFakeInsightsSupabase({ posts: [post] });
  const due = await getDueInsightsPulls(client);
  const mock = installMockFetch(due.flatMap(pullResponses));

  try {
    const summary = await runInsightsBatch(client, due, fakeCreds);
    assert.equal(summary.pulled, 1);
    const firstRunCalls = 1 + BREAKDOWN_PROBES.length;
    assert.equal(mock.calls.length, firstRunCalls);

    // Second "cron tick": nothing left due, so runInsightsBatch is never
    // even asked to do anything, and definitely makes no extra API calls.
    const dueSecondRun = await getDueInsightsPulls(client);
    assert.equal(dueSecondRun.length, 0);
    const summary2 = await runInsightsBatch(client, dueSecondRun, fakeCreds);
    assert.equal(summary2.pulled, 0);
    assert.equal(mock.calls.length, firstRunCalls, "no duplicate insights call for an already-pulled window");
  } finally {
    mock.restore();
  }
});

test("runInsightsBatch: multiple due pulls across posts and windows are each recorded separately", async () => {
  const posts = [
    makePost({ id: "p1", format: "carousel", status: "published", ig_media_id: "ig-media-1", published_at: hoursAgo(170) }), // 2 windows due
    makePost({ id: "p2", format: "reel", status: "published", ig_media_id: "ig-media-2", published_at: hoursAgo(61) }), // 1 window due
  ];
  const { client, upsertCalls } = createFakeInsightsSupabase({ posts });
  const due = await getDueInsightsPulls(client);
  assert.equal(due.length, 3);
  const mock = installMockFetch(due.flatMap(pullResponses));

  try {
    const summary = await runInsightsBatch(client, due, fakeCreds);
    assert.equal(summary.pulled, 3);
    assert.equal(upsertCalls.length, 3);
    assert.equal(new Set(upsertCalls.map((r) => `${r.post_id}:${r.pull_window}`)).size, 3, "each (post, window) pair must be a distinct row");
  } finally {
    mock.restore();
  }
});

test("runInsightsBatch: with concurrency, the daily refresh writes one 'current' row per post and keeps results in order", async () => {
  const posts = ["a", "b", "c"].map((id, i) =>
    makePost({ id, format: "carousel", status: "published", ig_media_id: `ig-${id}`, published_at: hoursAgo(24 * (i + 1)) })
  );
  const { client, state } = createFakeInsightsSupabase({ posts });
  // Each pull is one insights request plus two breakdown probes; the
  // probes reading a plain insights body just leaves their numbers null.
  const mock = installMockFetch(Array.from({ length: 9 }, () => carouselInsights));

  try {
    const due = await getDueRefreshPulls(client);
    const summary = await runInsightsBatch(client, due, fakeCreds, 3);
    assert.equal(summary.pulled, 3);
    assert.deepEqual(summary.results.map((r) => `${r.postId}:${r.window}`), due.map((d) => `${d.post.id}:current`));
    assert.deepEqual(state.postMetrics.map((r) => `${r.post_id}:${r.pull_window}:${r.reach}`).sort(), ["a:current:500", "b:current:500", "c:current:500"]);

    // A second run straight after finds nothing stale.
    assert.equal((await getDueRefreshPulls(client)).length, 0);
  } finally {
    mock.restore();
  }
});
