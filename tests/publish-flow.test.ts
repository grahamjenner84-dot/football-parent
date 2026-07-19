import "./helpers/env-setup"; // must run before publish-flow.ts is imported - sets fast poll/retry timings
import { test } from "node:test";
import assert from "node:assert/strict";
import { installMockFetch } from "./helpers/mock-fetch";
import { makePost, makeSlide, fakeCreds, createFakeSupabase } from "./helpers/fixtures";
import { publishPost, runPublishBatch, isDryRun } from "../lib/instagram/publish-flow";

function ok(body: unknown) {
  return { status: 200, body };
}
function err(status: number, code: number, message: string) {
  return { status, body: { error: { code, message } } };
}

test("carousel: EXPIRED child is recreated, FINISHED sibling is reused untouched, dry-run stops before publish", async () => {
  const { client: supabase, calls: dbCalls } = createFakeSupabase();
  const post = makePost({
    format: "carousel",
    post_slides: [
      makeSlide({ id: "slide-1", slide_order: 1, ig_child_container_id: "child1-old" }),
      makeSlide({ id: "slide-2", slide_order: 2, ig_child_container_id: "child2-old" }),
    ],
  });

  const mock = installMockFetch([
    ok({ status_code: "FINISHED" }), // GET child1-old -> reused, no recreate
    ok({ status_code: "EXPIRED" }), // GET child2-old -> expired
    ok({ id: "child2-new" }), // POST recreate child2
    ok({ status_code: "FINISHED" }), // GET child2-new -> finished
    ok({ id: "parent-new" }), // POST create parent (no existing parent container)
    ok({ status_code: "FINISHED" }), // GET parent-new -> finished
  ]);

  try {
    const outcome = await publishPost(supabase, post, fakeCreds, true /* dryRun */);

    assert.equal(outcome.outcome, "dry_run_ready");
    assert.equal(outcome.containerId, "parent-new");
    assert.equal(mock.calls.length, 6, "should not have recreated the already-FINISHED child1");

    // No create-container call was made for slide 1 (only its status GET) -
    // the only POST-with-is_carousel_item is for slide 2's replacement.
    const createChildCalls = mock.calls.filter((c) => c.method === "POST" && c.body?.includes("is_carousel_item"));
    assert.equal(createChildCalls.length, 1);

    // Never touched media_publish - dry run must stop before it.
    assert.equal(mock.calls.some((c) => c.url.includes("media_publish")), false);

    // Persisted the new child container id and the new parent container id.
    const childSave = dbCalls.find((c) => c.table === "post_slides" && c.match.id === "slide-2");
    assert.equal(childSave?.payload.ig_child_container_id, "child2-new");
    const parentSave = dbCalls.find((c) => c.table === "posts" && c.payload.ig_container_id === "parent-new");
    assert.ok(parentSave, "expected the new parent container id to be saved");

    // Never flipped to published or failed during a dry run.
    assert.equal(dbCalls.some((c) => c.payload.status === "published" || c.payload.status === "failed"), false);
  } finally {
    mock.restore();
  }
});

test("polling: IN_PROGRESS then FINISHED resolves without erroring", async () => {
  const { client: supabase } = createFakeSupabase();
  const post = makePost({
    format: "reel",
    post_slides: [makeSlide({ slide_order: 1, image_url: null, video_url: "https://example.com/video.mp4", duration_sec: 10 })],
  });

  const mock = installMockFetch([
    { status: 200, body: "", headers: { "content-type": "video/mp4" } }, // HEAD validateVideoUrl
    ok({ id: "reel-container-1" }), // POST create reel container
    ok({ status_code: "IN_PROGRESS" }), // poll #1
    ok({ status_code: "FINISHED" }), // poll #2
  ]);

  try {
    const outcome = await publishPost(supabase, post, fakeCreds, true);
    assert.equal(outcome.outcome, "dry_run_ready");
    assert.equal(outcome.containerId, "reel-container-1");
  } finally {
    mock.restore();
  }
});

test("polling: never resolves within the poll budget -> StillProcessingError, post left untouched", async () => {
  const { client: supabase, calls: dbCalls } = createFakeSupabase();
  const post = makePost({
    format: "reel",
    post_slides: [makeSlide({ slide_order: 1, image_url: null, video_url: "https://example.com/video.mp4", duration_sec: 10 })],
  });

  const steps = [
    { status: 200, body: "", headers: { "content-type": "video/mp4" } }, // HEAD
    ok({ id: "reel-container-2" }), // POST create
    ...Array.from({ length: 20 }, () => ok({ status_code: "IN_PROGRESS" })), // never finishes
  ];
  const mock = installMockFetch(steps);

  try {
    const summary = await runPublishBatch(supabase, [post], fakeCreds, true);
    assert.equal(summary.stillProcessing, 1);
    assert.equal(summary.failed, 0);
    assert.equal(summary.deferred, 0);
    // status must NOT have been touched - no update call at all for this post.
    assert.equal(dbCalls.length, 1, "only the container-id save from creation, no status change");
    assert.equal(dbCalls[0].payload.ig_container_id, "reel-container-2");
  } finally {
    mock.restore();
  }
});

test("reels: over the 90s cap fails clearly with zero network calls", async () => {
  const { client: supabase, calls: dbCalls } = createFakeSupabase();
  const post = makePost({
    format: "reel",
    post_slides: [makeSlide({ slide_order: 1, image_url: null, video_url: "https://example.com/video.mp4", duration_sec: 95 })],
  });

  const mock = installMockFetch([]); // must not be called at all
  try {
    const summary = await runPublishBatch(supabase, [post], fakeCreds, true);
    assert.equal(summary.failed, 1);
    assert.match(summary.results[0].error ?? "", /90s/);
    assert.equal(mock.calls.length, 0);
    const failSave = dbCalls.find((c) => c.payload.status === "failed");
    assert.ok(failSave, "expected status=failed to be persisted");
    assert.match(String(failSave?.payload.error_message), /90s/);
  } finally {
    mock.restore();
  }
});

test("reels: missing duration_sec fails clearly instead of silently skipping the 90s check", async () => {
  const { client: supabase } = createFakeSupabase();
  const post = makePost({
    format: "reel",
    post_slides: [makeSlide({ slide_order: 1, image_url: null, video_url: "https://example.com/video.mp4", duration_sec: null })],
  });
  const mock = installMockFetch([]);
  try {
    const summary = await runPublishBatch(supabase, [post], fakeCreds, true);
    assert.equal(summary.failed, 1);
    assert.match(summary.results[0].error ?? "", /duration_sec/);
  } finally {
    mock.restore();
  }
});

test("a persistent platform outage (500/code 1) is deferred, NOT marked failed - this is the exact shape hit for real on 2026-07-19", async () => {
  const { client: supabase, calls: dbCalls } = createFakeSupabase();
  const post = makePost({
    format: "reel",
    post_slides: [makeSlide({ slide_order: 1, image_url: null, video_url: "https://example.com/video.mp4", duration_sec: 10 })],
  });

  const mock = installMockFetch([
    { status: 200, body: "", headers: { "content-type": "video/mp4" } }, // HEAD ok
    err(500, 1, "An unknown error occurred"), // create attempt 1
    err(500, 1, "An unknown error occurred"), // retry 1
    err(500, 1, "An unknown error occurred"), // retry 2
    err(500, 1, "An unknown error occurred"), // retry 3 (withRetry default retries=3 -> 4 attempts total)
  ]);

  try {
    const summary = await runPublishBatch(supabase, [post], fakeCreds, false /* live mode - outage must still not burn the post */);
    assert.equal(summary.deferred, 1, "outage should be deferred");
    assert.equal(summary.failed, 0, "outage must NOT be marked failed");
    assert.equal(
      dbCalls.some((c) => c.payload.status === "failed"),
      false,
      "no status=failed write should have happened for a transient outage"
    );
  } finally {
    mock.restore();
  }
});

test("crash recovery: an existing FINISHED container is reused, not recreated, before publishing", async () => {
  const { client: supabase, calls: dbCalls } = createFakeSupabase();
  const post = makePost({
    format: "reel",
    ig_container_id: "existing-container-1", // simulates a prior run that created the container then crashed
    post_slides: [makeSlide({ slide_order: 1, image_url: null, video_url: "https://example.com/video.mp4", duration_sec: 10 })],
  });

  const mock = installMockFetch([
    { status: 200, body: "", headers: { "content-type": "video/mp4" } }, // HEAD
    ok({ status_code: "FINISHED" }), // GET existing container -> already finished
    ok({ id: "ig-media-999" }), // POST media_publish
  ]);

  try {
    const outcome = await publishPost(supabase, post, fakeCreds, false /* live */);
    assert.equal(mock.calls.length, 3, "must not have created a second container");
    assert.equal(mock.calls.some((c) => c.method === "POST" && c.url.includes("/media") && !c.url.includes("media_publish")), false);
    assert.equal(outcome.outcome, "published");
    assert.equal(outcome.mediaId, "ig-media-999");
    const publishedSave = dbCalls.find((c) => c.payload.status === "published");
    assert.equal(publishedSave?.payload.ig_media_id, "ig-media-999");
  } finally {
    mock.restore();
  }
});

test("already-published guard: ig_media_id already set makes zero API calls and just fixes the status", async () => {
  const { client: supabase, calls: dbCalls } = createFakeSupabase();
  const post = makePost({
    format: "reel",
    status: "scheduled", // out of sync: crashed after media_publish succeeded, before the status write landed
    ig_media_id: "already-media-1",
    post_slides: [makeSlide({ slide_order: 1, image_url: null, video_url: "https://example.com/video.mp4", duration_sec: 10 })],
  });

  const mock = installMockFetch([]); // must not be called at all - this is the double-publish guard
  try {
    const outcome = await publishPost(supabase, post, fakeCreds, false);
    assert.equal(mock.calls.length, 0, "must not call the Instagram API again for an already-published post");
    assert.equal(outcome.outcome, "published");
    assert.equal(outcome.mediaId, "already-media-1");
    const fixSave = dbCalls.find((c) => c.payload.status === "published");
    assert.equal(fixSave?.payload.ig_media_id, "already-media-1");
  } finally {
    mock.restore();
  }
});

test("genuine validation failure (missing image_url) is marked failed with a queryable error message", async () => {
  const { client: supabase, calls: dbCalls } = createFakeSupabase();
  const post = makePost({
    format: "carousel",
    post_slides: [makeSlide({ slide_order: 1, image_url: null }), makeSlide({ slide_order: 2, image_url: "https://example.com/b.png" })],
  });
  const mock = installMockFetch([]);
  try {
    const summary = await runPublishBatch(supabase, [post], fakeCreds, true);
    assert.equal(summary.failed, 1);
    assert.ok(summary.results[0].error && summary.results[0].error.length > 0, "error must not be empty/silent");
    const failSave = dbCalls.find((c) => c.table === "posts" && c.payload.status === "failed");
    assert.ok(failSave, "failure must be queryable via posts.status/error_message");
    assert.ok(typeof failSave?.payload.error_message === "string" && (failSave.payload.error_message as string).length > 0);
  } finally {
    mock.restore();
  }
});

test("DRY_RUN: full carousel flow completes container creation and polling but never calls media_publish", async () => {
  const { client: supabase, calls: dbCalls } = createFakeSupabase();
  const post = makePost({
    format: "carousel",
    post_slides: [makeSlide({ id: "s1", slide_order: 1 }), makeSlide({ id: "s2", slide_order: 2 })],
  });
  const mock = installMockFetch([
    ok({ id: "child-1" }),
    ok({ status_code: "FINISHED" }),
    ok({ id: "child-2" }),
    ok({ status_code: "FINISHED" }),
    ok({ id: "parent-1" }),
    ok({ status_code: "FINISHED" }),
  ]);
  try {
    const outcome = await publishPost(supabase, post, fakeCreds, true);
    assert.equal(outcome.outcome, "dry_run_ready");
    assert.equal(
      mock.calls.some((c) => c.url.includes("media_publish")),
      false,
      "DRY_RUN must never call media_publish"
    );
    assert.equal(
      dbCalls.some((c) => c.payload.status === "published"),
      false
    );
  } finally {
    mock.restore();
  }
});

test("isDryRun defaults to true (fail closed) and is false only for the literal string 'false'", () => {
  const original = process.env.DRY_RUN;
  try {
    delete process.env.DRY_RUN;
    assert.equal(isDryRun(), true);
    process.env.DRY_RUN = "false";
    assert.equal(isDryRun(), false);
    process.env.DRY_RUN = "true";
    assert.equal(isDryRun(), true);
    process.env.DRY_RUN = "nonsense";
    assert.equal(isDryRun(), true);
  } finally {
    if (original === undefined) delete process.env.DRY_RUN;
    else process.env.DRY_RUN = original;
  }
});
