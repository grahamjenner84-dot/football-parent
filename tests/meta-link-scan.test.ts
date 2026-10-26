import { test } from "node:test";
import assert from "node:assert/strict";
import { findMetaScanBursts, isMetaScanRow, type MetaScanRow } from "../lib/meta-link-scan";

type Row = MetaScanRow & { path: string };

// Same shape as isCalculatorStepPath in lib/supabase/page-views.ts, which
// can't be imported here without pulling in the site's components.
const isEventPath = (path: string) =>
  path.startsWith("/coach-app/signup-form/") || path.startsWith("/progress/join-form/");

const FIREFOX = "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:58.0) Gecko/20100101 Firefox/59.0";
const CHROME_133 =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";
const CHROME_139 =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const FACEBOOK_APP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/530.0.0.40.104;FBBV/123]";
const INSTAGRAM_APP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.27.80";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const row = (time: string, path: string, referrer_host: string | null, user_agent: string | null): Row => ({
  created_at: `2026-10-26T${time}Z`,
  path,
  referrer_host,
  user_agent,
});

const PAUL_BARRY = "/academy-pathway/academy-life-paul-barry-interview";
const GIRLS_UNITED = "/girls-football/girls-united-daughter-football-interview";
const PRE_ACADEMY = "/parent-guides/pre-academy-football-parent-interview";
const CHRIS_ROBINSON = "/parent-guides/chris-robinson-football-scout-interview";
const COACH_APP = "/football-parent-coach-app";
const COACH_APP_FORM = "/coach-app/signup-form/football-parent-coach-app/view";
const PROGRESS = "/progress";
const PROGRESS_FORM = "/progress/join-form/site/join/view";

// Every Facebook-referred row of 2026-10-26 10:18-10:19 UK (UTC that day),
// as read from page_views.
const SCAN_26_OCT: Row[] = [
  row("10:18:13", PAUL_BARRY, "www.facebook.com", FIREFOX),
  row("10:18:22", PROGRESS, "www.facebook.com", FIREFOX),
  row("10:18:31", GIRLS_UNITED, "www.facebook.com", CHROME_133),
  row("10:18:31", COACH_APP, "www.facebook.com", CHROME_139),
  row("10:18:44", PROGRESS_FORM, "www.facebook.com", FIREFOX),
  row("10:18:48", COACH_APP_FORM, "www.facebook.com", CHROME_139),
  row("10:19:09", PRE_ACADEMY, "m.facebook.com", IPHONE),
  row("10:19:10", PAUL_BARRY, "m.facebook.com", IPHONE),
  row("10:19:11", GIRLS_UNITED, "m.facebook.com", IPHONE),
  row("10:19:11", COACH_APP_FORM, "m.facebook.com", IPHONE),
  row("10:19:11", COACH_APP, "m.facebook.com", IPHONE),
  row("10:19:12", CHRIS_ROBINSON, "m.facebook.com", IPHONE),
  row("10:19:20", PROGRESS_FORM, "m.facebook.com", IPHONE),
  row("10:19:21", PROGRESS, "m.facebook.com", IPHONE),
  row("10:19:25", CHRIS_ROBINSON, "m.facebook.com", IPHONE),
  row("10:19:31", GIRLS_UNITED, "m.facebook.com", IPHONE),
  row("10:19:32", PRE_ACADEMY, "m.facebook.com", IPHONE),
  row("10:19:33", PROGRESS, "m.facebook.com", IPHONE),
  row("10:19:33", PROGRESS_FORM, "m.facebook.com", IPHONE),
  row("10:19:39", PAUL_BARRY, "m.facebook.com", IPHONE),
  row("10:19:40", COACH_APP_FORM, "m.facebook.com", IPHONE),
  row("10:19:40", COACH_APP, "m.facebook.com", IPHONE),
];

test("the 26 Oct Meta scan is one burst and every row of it is flagged", () => {
  const bursts = findMetaScanBursts(SCAN_26_OCT, isEventPath);
  assert.equal(bursts.length, 1);
  assert.equal(SCAN_26_OCT.filter((r) => isMetaScanRow(r, bursts)).length, SCAN_26_OCT.length);
});

test("the same day's real social visits are left alone", () => {
  const real = [
    // Instagram app, Australia, 21:57.
    row("21:57:41", PAUL_BARRY, "l.instagram.com", INSTAGRAM_APP),
    // A Greek site opened inside Facebook's app, 19:16.
    row("19:16:59", "/academy-pathway/chelsea-fc-development-centre-guide", "www.sportsmarketinggreece.com", FACEBOOK_APP),
    // Ordinary search and internal traffic during the scan.
    row("10:18:40", PAUL_BARRY, "www.google.com", IPHONE),
    row("10:19:00", PROGRESS, "www.footballparent.co.uk", FIREFOX),
  ];
  const rows = [...SCAN_26_OCT, ...real];
  const bursts = findMetaScanBursts(rows, isEventPath);
  for (const r of real) assert.equal(isMetaScanRow(r, bursts), false, r.path);
});

test("someone reading inside the Facebook app is never flagged, even mid-scan", () => {
  const reader = row("10:19:10", COACH_APP, "m.facebook.com", FACEBOOK_APP);
  const bursts = findMetaScanBursts([...SCAN_26_OCT, reader], isEventPath);
  assert.equal(isMetaScanRow(reader, bursts), false);
});

test("several desktop Facebook readers on one shared article are not a scan", () => {
  const rows = [
    row("12:00:00", PAUL_BARRY, "www.facebook.com", DESKTOP_CHROME),
    row("12:00:20", PAUL_BARRY, "l.facebook.com", CHROME_133),
    row("12:00:40", PAUL_BARRY, "www.facebook.com", FIREFOX),
    row("12:01:00", PAUL_BARRY, "www.facebook.com", CHROME_139),
    row("12:01:05", COACH_APP_FORM, "www.facebook.com", CHROME_139),
  ];
  assert.deepEqual(findMetaScanBursts(rows, isEventPath), []);
});

test("three pages is below the bar, and form steps don't count as pages", () => {
  const rows = [
    row("12:00:00", PAUL_BARRY, "www.facebook.com", DESKTOP_CHROME),
    row("12:00:10", GIRLS_UNITED, "www.facebook.com", DESKTOP_CHROME),
    row("12:00:20", COACH_APP, "www.facebook.com", DESKTOP_CHROME),
    row("12:00:25", COACH_APP_FORM, "www.facebook.com", DESKTOP_CHROME),
    row("12:00:30", PROGRESS_FORM, "www.facebook.com", DESKTOP_CHROME),
  ];
  assert.deepEqual(findMetaScanBursts(rows, isEventPath), []);
});

test("Facebook visits to different pages spread over the day are not a scan", () => {
  const rows = [
    row("09:00:00", PAUL_BARRY, "www.facebook.com", DESKTOP_CHROME),
    row("11:30:00", GIRLS_UNITED, "m.facebook.com", IPHONE),
    row("14:10:00", PRE_ACADEMY, "www.facebook.com", FIREFOX),
    row("20:45:00", CHRIS_ROBINSON, "www.facebook.com", CHROME_139),
  ];
  assert.deepEqual(findMetaScanBursts(rows, isEventPath), []);
});

test("a Facebook visit outside the scan's window is not flagged", () => {
  const later = row("10:21:00", PAUL_BARRY, "www.facebook.com", DESKTOP_CHROME);
  const bursts = findMetaScanBursts([...SCAN_26_OCT, later], isEventPath);
  assert.equal(bursts.length, 1);
  assert.equal(isMetaScanRow(later, bursts), false);
});

test("hosts merely ending in facebook.com are not Facebook", () => {
  const rows = [PAUL_BARRY, GIRLS_UNITED, PRE_ACADEMY, CHRIS_ROBINSON].map((path, i) =>
    row(`12:00:0${i}`, path, "notfacebook.com", DESKTOP_CHROME)
  );
  assert.deepEqual(findMetaScanBursts(rows, isEventPath), []);
});
