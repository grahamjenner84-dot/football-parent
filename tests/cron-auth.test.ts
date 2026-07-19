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

test("vercel.json wires the publish endpoint to run every 15 minutes", () => {
  const raw = fs.readFileSync(path.join(REPO_ROOT, "vercel.json"), "utf8");
  const config = JSON.parse(raw);
  assert.equal(Array.isArray(config.crons), true);
  const publishCron = config.crons.find((c: { path: string }) => c.path === "/api/cron/publish");
  assert.ok(publishCron, "expected a /api/cron/publish entry");
  assert.equal(publishCron.schedule, "*/15 * * * *");
});

test("vercel.json wires the insights collector to run hourly", () => {
  const raw = fs.readFileSync(path.join(REPO_ROOT, "vercel.json"), "utf8");
  const config = JSON.parse(raw);
  const insightsCron = config.crons.find((c: { path: string }) => c.path === "/api/cron/insights");
  assert.ok(insightsCron, "expected a /api/cron/insights entry");
  assert.equal(insightsCron.schedule, "0 * * * *");
});

test("the publish cron route file exists at the path vercel.json points to", () => {
  const routePath = path.join(REPO_ROOT, "app", "api", "cron", "publish", "route.ts");
  assert.equal(fs.existsSync(routePath), true);
});

test("the insights cron route file exists at the path vercel.json points to", () => {
  const routePath = path.join(REPO_ROOT, "app", "api", "cron", "insights", "route.ts");
  assert.equal(fs.existsSync(routePath), true);
});
