import { test } from "node:test";
import assert from "node:assert/strict";
import { makePost, createFakeInsightsSupabase } from "./helpers/fixtures";
import { getDueInsightsPulls, getDueRefreshPulls, getPullWindows, metricsForFormat, parseInsightsResponse, buildMetricsRow, buildErrorRow } from "../lib/instagram/insights-pipeline";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function publishedPost(overrides: Partial<Parameters<typeof makePost>[0]> = {}) {
  return makePost({ status: "published", ig_media_id: "ig-media-1", published_at: hoursAgo(1000), ...overrides });
}

test("getPullWindows: defaults to early@6h (until 30h) + initial@60h + followup_7d@168h + followup_28d@672h when unset", () => {
  const original = process.env.INSIGHTS_PULL_WINDOWS;
  delete process.env.INSIGHTS_PULL_WINDOWS;
  try {
    const windows = getPullWindows();
    assert.deepEqual(windows, [
      { label: "early", delayHours: 6, maxAgeHours: 30 },
      { label: "initial", delayHours: 60 },
      { label: "followup_7d", delayHours: 168 },
      { label: "followup_28d", delayHours: 672 },
    ]);
  } finally {
    if (original === undefined) delete process.env.INSIGHTS_PULL_WINDOWS;
    else process.env.INSIGHTS_PULL_WINDOWS = original;
  }
});

test("getPullWindows: parses a custom schedule from env", () => {
  const original = process.env.INSIGHTS_PULL_WINDOWS;
  process.env.INSIGHTS_PULL_WINDOWS = "12:early, 240:late";
  try {
    assert.deepEqual(getPullWindows(), [
      { label: "early", delayHours: 12, maxAgeHours: undefined },
      { label: "late", delayHours: 240, maxAgeHours: undefined },
    ]);
  } finally {
    if (original === undefined) delete process.env.INSIGHTS_PULL_WINDOWS;
    else process.env.INSIGHTS_PULL_WINDOWS = original;
  }
});

test("getPullWindows: rejects a malformed entry loudly rather than silently skipping it", () => {
  const original = process.env.INSIGHTS_PULL_WINDOWS;
  process.env.INSIGHTS_PULL_WINDOWS = "not-a-number:oops";
  try {
    assert.throws(() => getPullWindows(), /Malformed/);
  } finally {
    if (original === undefined) delete process.env.INSIGHTS_PULL_WINDOWS;
    else process.env.INSIGHTS_PULL_WINDOWS = original;
  }
});

test("metricsForFormat: reels get views + ig_reels_avg_watch_time, carousel/feed don't; neither ever requests the retired 'impressions'", () => {
  const reelMetrics = metricsForFormat("reel");
  const carouselMetrics = metricsForFormat("carousel");
  assert.ok(reelMetrics.includes("views"));
  assert.ok(reelMetrics.includes("ig_reels_avg_watch_time"));
  assert.ok(!carouselMetrics.includes("views"));
  assert.ok(!carouselMetrics.includes("ig_reels_avg_watch_time"));
  assert.ok(!reelMetrics.includes("impressions"));
  assert.ok(!carouselMetrics.includes("impressions"));
  for (const m of ["reach", "likes", "comments", "shares", "total_interactions"]) {
    assert.ok(reelMetrics.includes(m) && carouselMetrics.includes(m));
  }
});

test("parseInsightsResponse: reads both the documented `values[]` shape and the `total_value` shape", () => {
  const parsed = parseInsightsResponse({
    data: [
      { name: "reach", period: "lifetime", values: [{ value: 1234 }] },
      { name: "total_interactions", total_value: { value: 88 } },
      { name: "junk_no_value" },
    ],
  });
  assert.equal(parsed.reach, 1234);
  assert.equal(parsed.total_interactions, 88);
  assert.equal("junk_no_value" in parsed, false);
});

test("buildMetricsRow: maps Meta's 'saved' metric name onto the 'saves' column, and converts ig_reels_avg_watch_time from milliseconds to avg_watch_time_sec (reels only)", () => {
  // 7500 here is MILLISECONDS - confirmed against a real live response
  // whose own field title reads "Reels average watch time (milliseconds)".
  const raw = { reach: 10, likes: 2, comments: 1, saved: 5, shares: 3, views: 40, total_interactions: 11, ig_reels_avg_watch_time: 7500 };
  const reelRow = buildMetricsRow("post-1", "initial", "reel", raw);
  assert.equal(reelRow.saves, 5);
  assert.equal(reelRow.avg_watch_time_sec, 7.5);
  assert.equal(reelRow.views, 40);

  const carouselRow = buildMetricsRow("post-1", "initial", "carousel", raw);
  assert.equal(carouselRow.saves, 5);
  assert.equal(carouselRow.avg_watch_time_sec, null, "carousel/feed posts never get a watch-time value");
});

test("buildErrorRow: carries the message and no metric values, so it's distinguishable from a real zero-engagement pull", () => {
  const row = buildErrorRow("post-1", "initial", "boom");
  assert.equal(row.pull_error, "boom");
  assert.equal(row.reach, undefined);
});

test("getDueInsightsPulls: a post published 60h ago is due for 'initial' but not yet 'followup_7d'", async () => {
  const post = publishedPost({ id: "p1", published_at: hoursAgo(61) });
  const { client } = createFakeInsightsSupabase({ posts: [post] });
  const due = await getDueInsightsPulls(client);
  assert.equal(due.length, 1);
  assert.equal(due[0].window.label, "initial");
});

test("getDueInsightsPulls: a post published 170h ago with no prior pulls is due for BOTH windows at once", async () => {
  const post = publishedPost({ id: "p1", published_at: hoursAgo(170) });
  const { client } = createFakeInsightsSupabase({ posts: [post] });
  const due = await getDueInsightsPulls(client);
  assert.deepEqual(
    due.map((d) => d.window.label).sort(),
    ["followup_7d", "initial"]
  );
});

test("getDueInsightsPulls: a post published only 3h ago is not due for anything yet", async () => {
  const post = publishedPost({ id: "p1", published_at: hoursAgo(3) });
  const { client } = createFakeInsightsSupabase({ posts: [post] });
  const due = await getDueInsightsPulls(client);
  assert.equal(due.length, 0);
});

test("getDueInsightsPulls: a window with an existing post_metrics row (success OR error marker) is never due again", async () => {
  const post = publishedPost({ id: "p1", published_at: hoursAgo(170) });
  const { client } = createFakeInsightsSupabase({
    posts: [post],
    postMetrics: [{ post_id: "p1", pull_window: "initial", reach: 100 }],
  });
  const due = await getDueInsightsPulls(client);
  assert.equal(due.length, 1);
  assert.equal(due[0].window.label, "followup_7d", "initial already has a row, so only followup_7d should still be due");
});

test("getDueInsightsPulls: a post past 28 days with its earlier pulls done is due for 'followup_28d' only", async () => {
  const post = publishedPost({ id: "p1", published_at: hoursAgo(700) });
  const { client } = createFakeInsightsSupabase({
    posts: [post],
    postMetrics: [
      { post_id: "p1", pull_window: "initial", reach: 100 },
      { post_id: "p1", pull_window: "followup_7d", reach: 120 },
    ],
  });
  const due = await getDueInsightsPulls(client);
  assert.deepEqual(due.map((d) => d.window.label), ["followup_28d"]);
});

test("getDueInsightsPulls: a backlog of 28-day pulls doesn't push a newer post's 7-day pull past the limit", async () => {
  const backlog = [1000, 900, 800].map((h, i) =>
    publishedPost({ id: `old${i}`, published_at: hoursAgo(h) })
  );
  const recent = publishedPost({ id: "recent", published_at: hoursAgo(170) });
  const { client } = createFakeInsightsSupabase({
    posts: [...backlog, recent],
    postMetrics: [
      ...backlog.flatMap((p) => [
        { post_id: p.id, pull_window: "initial", reach: 100 },
        { post_id: p.id, pull_window: "followup_7d", reach: 100 },
      ]),
      { post_id: "recent", pull_window: "initial", reach: 100 },
    ],
  });
  const due = await getDueInsightsPulls(client, 2);
  assert.deepEqual(
    due.map((d) => `${d.post.id}:${d.window.label}`),
    ["recent:followup_7d", "old2:followup_28d"],
    "the 7-day pull goes first, then the newest of the 28-day backlog"
  );
});

test("getDueRefreshPulls: refreshes posts under 30 days old into 'current', skipping older posts and ones refreshed in the last 20h", async () => {
  const posts = [
    publishedPost({ id: "never", published_at: hoursAgo(5 * 24) }),
    publishedPost({ id: "stale", published_at: hoursAgo(10 * 24) }),
    publishedPost({ id: "fresh", published_at: hoursAgo(2 * 24) }),
    publishedPost({ id: "too-old", published_at: hoursAgo(31 * 24) }),
  ];
  const { client } = createFakeInsightsSupabase({
    posts,
    postMetrics: [
      { post_id: "stale", pull_window: "current", pulled_at: hoursAgo(21), reach: 10 },
      { post_id: "fresh", pull_window: "current", pulled_at: hoursAgo(2), reach: 10 },
      // A fixed-window row doesn't count as a refresh.
      { post_id: "never", pull_window: "initial", pulled_at: hoursAgo(1), reach: 10 },
    ],
  });
  const due = await getDueRefreshPulls(client);
  assert.deepEqual(
    due.map((d) => `${d.post.id}:${d.window.label}`),
    ["never:current", "stale:current"],
    "never-refreshed first, then the stalest; the fresh and the 31-day-old posts are left alone"
  );
});

test("getDueRefreshPulls: doesn't touch the fixed windows' due list", async () => {
  const post = publishedPost({ id: "p1", published_at: hoursAgo(700) });
  const { client } = createFakeInsightsSupabase({
    posts: [post],
    postMetrics: [
      { post_id: "p1", pull_window: "initial", reach: 100 },
      { post_id: "p1", pull_window: "followup_7d", reach: 120 },
      { post_id: "p1", pull_window: "current", pulled_at: hoursAgo(30), reach: 130 },
    ],
  });
  assert.deepEqual((await getDueInsightsPulls(client)).map((d) => d.window.label), ["followup_28d"]);
});

test("getDueInsightsPulls: respects the limit across multiple posts", async () => {
  const posts = [
    publishedPost({ id: "p1", published_at: hoursAgo(170) }), // 2 windows due
    publishedPost({ id: "p2", published_at: hoursAgo(170) }), // 2 windows due
  ];
  const { client } = createFakeInsightsSupabase({ posts });
  const due = await getDueInsightsPulls(client, 3);
  assert.equal(due.length, 3);
});
