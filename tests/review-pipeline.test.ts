import { test } from "node:test";
import assert from "node:assert/strict";
import { installMockFetch } from "./helpers/mock-fetch";
import { fakeCreds, createFakeSupabase } from "./helpers/fixtures";
import { computeAutoScheduleSlots, zonedTimeToUtc, normalizePermalink, markManualReelPosted, ScheduleSettings } from "../lib/instagram/review-pipeline";

function ok(body: unknown) {
  return { status: 200, body };
}

const LONDON_SUMMER: ScheduleSettings = { postingTime: "18:00", cadenceDays: 1, timezone: "Europe/London" };

test("zonedTimeToUtc: 18:00 Europe/London in July (BST, UTC+1) is 17:00 UTC", () => {
  const d = zonedTimeToUtc("2026-07-15", "18:00", "Europe/London");
  assert.equal(d.toISOString(), "2026-07-15T17:00:00.000Z");
});

test("zonedTimeToUtc: 18:00 Europe/London in January (GMT, UTC+0) is 18:00 UTC", () => {
  const d = zonedTimeToUtc("2026-01-15", "18:00", "Europe/London");
  assert.equal(d.toISOString(), "2026-01-15T18:00:00.000Z");
});

test("computeAutoScheduleSlots: with no occupied times, spaces slots exactly cadenceDays apart at the configured posting time", () => {
  const now = new Date("2026-07-15T09:00:00.000Z"); // well before 18:00 London
  const slots = computeAutoScheduleSlots({ count: 3, settings: LONDON_SUMMER, occupiedTimes: [], now });
  assert.equal(slots.length, 3);
  assert.equal(slots[0].toISOString(), "2026-07-15T17:00:00.000Z");
  assert.equal(slots[1].toISOString(), "2026-07-16T17:00:00.000Z");
  assert.equal(slots[2].toISOString(), "2026-07-17T17:00:00.000Z");
});

test("computeAutoScheduleSlots: rolls to tomorrow when today's posting time has already passed", () => {
  const now = new Date("2026-07-15T20:00:00.000Z"); // after 18:00 London (17:00 UTC) today
  const slots = computeAutoScheduleSlots({ count: 1, settings: LONDON_SUMMER, occupiedTimes: [], now });
  assert.equal(slots[0].toISOString(), "2026-07-16T17:00:00.000Z");
});

test("computeAutoScheduleSlots: skips a slot already occupied by an existing scheduled post, respecting cadence", () => {
  const now = new Date("2026-07-15T09:00:00.000Z");
  // Tomorrow's natural slot (07-16 17:00 UTC) is already taken.
  const slots = computeAutoScheduleSlots({
    count: 2,
    settings: LONDON_SUMMER,
    occupiedTimes: ["2026-07-16T17:00:00.000Z"],
    now,
  });
  assert.equal(slots[0].toISOString(), "2026-07-15T17:00:00.000Z", "today's slot is still free");
  assert.equal(slots[1].toISOString(), "2026-07-17T17:00:00.000Z", "tomorrow is taken, so this batch's 2nd item skips to the day after");
});

test("computeAutoScheduleSlots: a batch never collides with itself across multiple items", () => {
  const now = new Date("2026-07-15T09:00:00.000Z");
  const slots = computeAutoScheduleSlots({ count: 5, settings: LONDON_SUMMER, occupiedTimes: [], now });
  const times = slots.map((s) => s.getTime());
  assert.equal(new Set(times).size, 5, "every slot must be distinct");
});

test("normalizePermalink: strips protocol/host/trailing-slash/query differences down to the same path", () => {
  const a = normalizePermalink("https://www.instagram.com/reel/ABC123/");
  const b = normalizePermalink("https://instagram.com/reel/ABC123?igsh=xyz");
  const c = normalizePermalink("http://www.instagram.com/reel/abc123");
  assert.equal(a, "/reel/abc123");
  assert.equal(a, b);
  assert.equal(a, c);
});

test("normalizePermalink: different shortcodes never normalize to the same value", () => {
  assert.notEqual(normalizePermalink("https://www.instagram.com/reel/ABC123/"), normalizePermalink("https://www.instagram.com/reel/XYZ999/"));
});

test("markManualReelPosted: matches the pasted permalink against the account's recent media and captures ig_media_id", async () => {
  const { client: supabase, calls } = createFakeSupabase();
  const mock = installMockFetch([
    ok({
      data: [
        { id: "other-media", permalink: "https://www.instagram.com/reel/OTHER1/", timestamp: "2026-07-14T10:00:00+0000" },
        { id: "the-real-one", permalink: "https://www.instagram.com/reel/ABC123/", timestamp: "2026-07-15T12:00:00+0000" },
      ],
    }),
  ]);
  try {
    const result = await markManualReelPosted(supabase, fakeCreds, "post-1", "https://www.instagram.com/reel/ABC123/?igsh=xyz");
    assert.equal(result.matched, true);
    assert.equal(result.igMediaId, "the-real-one");
    const update = calls.find((c) => c.table === "posts");
    assert.equal(update?.payload.status, "published");
    assert.equal(update?.payload.ig_media_id, "the-real-one");
  } finally {
    mock.restore();
  }
});

test("markManualReelPosted: throws a retry-friendly error when no match is found (e.g. Instagram hasn't indexed it yet)", async () => {
  const { client: supabase } = createFakeSupabase();
  const mock = installMockFetch([ok({ data: [] })]);
  try {
    await assert.rejects(() => markManualReelPosted(supabase, fakeCreds, "post-1", "https://www.instagram.com/reel/ABC123/"), /No matching post/);
  } finally {
    mock.restore();
  }
});

test("markManualReelPosted: skipMatch marks published without ever calling the Graph API or setting ig_media_id", async () => {
  const { client: supabase, calls } = createFakeSupabase();
  const mock = installMockFetch([]); // any fetch call would throw "unexpected extra fetch call"
  try {
    const result = await markManualReelPosted(supabase, fakeCreds, "post-1", "", { skipMatch: true });
    assert.equal(result.matched, false);
    assert.equal(result.igMediaId, null);
    const update = calls.find((c) => c.table === "posts");
    assert.equal(update?.payload.status, "published");
    assert.equal(update?.payload.ig_media_id, undefined);
  } finally {
    mock.restore();
  }
});
