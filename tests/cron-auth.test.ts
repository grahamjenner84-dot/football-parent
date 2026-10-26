import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isAuthorizedCronRequest } from "../lib/cron-auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

test("rejects any request when CRON_SECRET is not configured", () => {
  const original = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    assert.equal(isAuthorizedCronRequest("Bearer anything"), false);
    assert.equal(isAuthorizedCronRequest(null), false);
  } finally {
    if (original !== undefined) process.env.CRON_SECRET = original;
  }
});

test("rejects a missing Authorization header", () => {
  const original = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "s3cret";
  try {
    assert.equal(isAuthorizedCronRequest(null), false);
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  }
});

test("rejects the wrong token - this is what stops a random caller from triggering a real publish", () => {
  const original = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "s3cret";
  try {
    assert.equal(isAuthorizedCronRequest("Bearer wrong-guess"), false);
    assert.equal(isAuthorizedCronRequest("s3cret"), false); // missing "Bearer " prefix
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  }
});

test("accepts the correct bearer token - what Vercel Cron (or an external scheduler) sends", () => {
  const original = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "s3cret";
  try {
    assert.equal(isAuthorizedCronRequest("Bearer s3cret"), true);
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  }
});

type VercelCron = { path: string; schedule: string };

function vercelCrons(): VercelCron[] {
  const config = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "vercel.json"), "utf8"));
  assert.equal(Array.isArray(config.crons), true);
  return config.crons;
}

// Vercel's Hobby plan only allows once-a-day cron schedules, and a more
// frequent one doesn't fail loudly: it fails deploy validation, so every
// push builds nothing. That happened for two days in July 2026 with a
// */15 publish cron (ad95bc6).
test("every vercel.json cron runs at most once a day - Hobby plan rejects anything more frequent", () => {
  for (const cron of vercelCrons()) {
    const [minute, hour] = cron.schedule.split(/\s+/);
    assert.match(minute, /^\d+$/, `${cron.path}: minute field "${minute}" runs more than once a day`);
    assert.match(hour, /^\d+$/, `${cron.path}: hour field "${hour}" runs more than once a day`);
  }
});

test("vercel.json runs the insights collector nightly at 03:00 and the refresh at 04:00 UTC", () => {
  const crons = vercelCrons();
  assert.equal(crons.find((c) => c.path === "/api/cron/insights")?.schedule, "0 3 * * *");
  assert.equal(crons.find((c) => c.path === "/api/cron/insights-refresh")?.schedule, "0 4 * * *");
});

// Publishing needs to run more often than daily when it's scheduled at all,
// so it lives in GitHub Actions rather than vercel.json, calling the same
// endpoint with the CRON_SECRET bearer. Its schedule has been switched off
// since 2026-07-21 (run by hand from the Actions tab), which this
// deliberately doesn't pin either way.
test("the publish endpoint is called from GitHub Actions with the CRON_SECRET bearer, not from vercel.json", () => {
  assert.equal(vercelCrons().some((c) => c.path === "/api/cron/publish"), false);
  const workflow = fs.readFileSync(path.join(REPO_ROOT, ".github", "workflows", "cron-publish.yml"), "utf8");
  assert.match(workflow, /https:\/\/www\.footballparent\.co\.uk\/api\/cron\/publish/);
  assert.match(workflow, /Authorization: Bearer \$\{\{ secrets\.CRON_SECRET \}\}/);
});

test("the publish cron route file exists at the path cron-publish.yml calls", () => {
  const routePath = path.join(REPO_ROOT, "app", "api", "cron", "publish", "route.ts");
  assert.equal(fs.existsSync(routePath), true);
});

test("the insights cron route file exists at the path vercel.json points to", () => {
  const routePath = path.join(REPO_ROOT, "app", "api", "cron", "insights", "route.ts");
  assert.equal(fs.existsSync(routePath), true);
});
