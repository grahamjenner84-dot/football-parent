import "./helpers/env-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { installMockFetch } from "./helpers/mock-fetch";
import { withRetry, isTransientError, IgApiError, publishContainer } from "../lib/instagram/graph-client";

test("isTransientError: HTTP 500 + code 1 (the real Meta outage shape hit on 2026-07-19) is transient", () => {
  const err = new IgApiError("An unknown error occurred", 500, { code: 1 });
  assert.equal(isTransientError(err), true);
});

test("isTransientError: HTTP 400 + code 190 (expired/invalid token) is NOT transient", () => {
  const err = new IgApiError("Invalid OAuth access token", 400, { code: 190 });
  assert.equal(isTransientError(err), false);
});

test("isTransientError: a plain validation error (not an IgApiError) is NOT transient", () => {
  assert.equal(isTransientError(new Error("some post_slides row has no image_url")), false);
});

test("withRetry: retries once on a transient failure, then succeeds", async () => {
  const mock = installMockFetch([
    { status: 500, body: { error: { code: 1, message: "An unknown error occurred" } } },
    { status: 200, body: { id: "media-123" } },
  ]);
  try {
    const result = await withRetry(() => publishContainer("ig-user", "token", "container-1"));
    assert.equal(result.id, "media-123");
    assert.equal(mock.calls.length, 2);
  } finally {
    mock.restore();
  }
});

test("withRetry: bounded attempts on a persistent transient failure - never loops forever", async () => {
  const steps = Array.from({ length: 10 }, () => ({ status: 500, body: { error: { code: 1, message: "down" } } }));
  const mock = installMockFetch(steps);
  try {
    await assert.rejects(() => withRetry(() => publishContainer("ig-user", "token", "container-1"), { retries: 2 }));
    // exactly 1 initial attempt + 2 retries, not more - this bound is what
    // keeps a sustained outage from turning into a runaway retry loop that
    // could burn into the 100-posts/24h publish quota.
    assert.equal(mock.calls.length, 3);
  } finally {
    mock.restore();
  }
});

test("withRetry: does not retry a non-transient (bad request shaped) error", async () => {
  const mock = installMockFetch([{ status: 400, body: { error: { code: 100, message: "Invalid parameter" } } }]);
  try {
    await assert.rejects(() => withRetry(() => publishContainer("ig-user", "token", "container-1")));
    assert.equal(mock.calls.length, 1);
  } finally {
    mock.restore();
  }
});
