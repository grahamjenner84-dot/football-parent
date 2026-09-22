import { getDataForSeoCredentials, redactSecrets } from "./env.mjs";
import { cacheKeyFor, readCache, writeCache, logApiUsage } from "./cache.mjs";
import { CONFIG } from "../config.mjs";

const BASE_URLS = {
  sandbox: "https://sandbox.dataforseo.com/v3",
  live: "https://api.dataforseo.com/v3",
};

let liveEnabled = false;
let callCount = 0;

export function setLiveEnabled(value) {
  liveEnabled = value;
}

export function isLive() {
  return liveEnabled;
}

export function environmentBanner() {
  return liveEnabled ? "LIVE - potentially chargeable" : "SANDBOX - dummy data, no cost";
}

function authHeader() {
  const { username, password } = getDataForSeoCredentials();
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rawRequest(endpoint, body, method = "POST") {
  const baseUrl = BASE_URLS[liveEnabled ? "live" : "sandbox"];
  const url = `${baseUrl}/${endpoint}`.replace(/([^:])\/\/+/g, "$1/");

  let lastError = null;
  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    if (attempt > 0) await sleep(CONFIG.retryBackoffMs * attempt);
    try {
      const res = await fetch(url, {
        method,
        headers:
          method === "GET"
            ? { Authorization: authHeader() }
            : { Authorization: authHeader(), "Content-Type": "application/json" },
        ...(method === "POST" ? { body: JSON.stringify(Array.isArray(body) ? body : [body]) } : {}),
      });

      if (res.status === 429) {
        lastError = "rate_limited (HTTP 429)";
        continue; // retry with backoff
      }
      if (res.status >= 500) {
        lastError = `HTTP ${res.status} (server error)`;
        continue; // retry
      }
      if (!res.ok) {
        const text = redactSecrets(await res.text().catch(() => ""));
        return { data: null, error: `HTTP ${res.status}: ${text}`, cost: null };
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return { data: null, error: "malformed_json_response", cost: null };
      }

      // 20000-20199 are DataForSEO's success family (20000 "Ok", 20100
      // "Task Created" for async task_post calls) - only >=40000 is a real
      // error. Confirmed against the sandbox: task_post legitimately
      // returns task.status_code 20100, which an exact-match check against
      // 20000 alone would misclassify as an error.
      const isSuccessCode = (code) => typeof code === "number" && code >= 20000 && code < 20200;
      const task = data.tasks?.[0];
      if (!isSuccessCode(data.status_code)) {
        return { data, error: `${data.status_code}: ${data.status_message ?? "unknown envelope error"}`, cost: data.cost ?? null };
      }
      if (task && task.status_code !== undefined && !isSuccessCode(task.status_code)) {
        return { data, error: `task ${task.status_code}: ${task.status_message ?? "unknown task error"}`, cost: data.cost ?? null };
      }
      return { data, error: null, cost: data.cost ?? null };
    } catch (err) {
      lastError = redactSecrets(err instanceof Error ? err.message : String(err));
    }
  }
  return { data: null, error: lastError ?? "unknown_error", cost: null };
}

// Cache-first single-call endpoint (the /live family: serp, dataforseo_labs,
// backlinks). Never touches the network on a fresh cache hit, sandbox or live.
export async function dataForSeoCall({ family, endpoint, body, workflow, forceRefresh = false }) {
  const key = cacheKeyFor(family, { endpoint, body, live: liveEnabled });
  const ttlDays = CONFIG.cacheTtlDays[family] ?? 14;

  if (!forceRefresh) {
    const cached = readCache(family, key, ttlDays);
    if (cached) return { ...cached, cacheStatus: "hit" };
  }

  await sleep(CONFIG.requestDelayMs);
  callCount += 1;
  const { data, error, cost } = await rawRequest(endpoint, body);

  const result = { data, error, cost, environment: liveEnabled ? "live" : "sandbox" };
  logApiUsage({ workflow, family, endpoint, environment: result.environment, cost, error, cacheStatus: "miss" });

  if (!error || error.startsWith("task ")) {
    // A task-level error still carries a usable envelope for some endpoints
    // (e.g. "no data found") - cache it so a retry doesn't re-pay for the
    // same negative result.
    writeCache(family, key, result);
  }
  return { ...result, cacheStatus: "miss" };
}

// Task-based endpoints (on_page): task_post once, then poll task_get/summary
// until the crawl/report is ready. Cached on the *initial post body* so a
// resumed run doesn't recreate a crawl task it already has results for.
export async function dataForSeoTaskCall({
  family,
  postEndpoint,
  body,
  getEndpointFor,
  workflow,
  pollAttempts = CONFIG.onPagePollAttempts,
  pollDelayMs = CONFIG.onPagePollDelayMs,
  isReady = (data) => Boolean(data?.tasks?.[0]?.result?.length),
  forceRefresh = false,
}) {
  const key = cacheKeyFor(family, { postEndpoint, body, live: liveEnabled });
  const ttlDays = CONFIG.cacheTtlDays[family] ?? 14;

  if (!forceRefresh) {
    const cached = readCache(family, key, ttlDays);
    if (cached) return { ...cached, cacheStatus: "hit" };
  }

  await sleep(CONFIG.requestDelayMs);
  callCount += 1;
  const posted = await rawRequest(postEndpoint, body);
  if (posted.error && !posted.data?.tasks?.[0]?.id) {
    const result = { data: null, error: posted.error, cost: posted.cost, environment: liveEnabled ? "live" : "sandbox" };
    logApiUsage({ workflow, family, endpoint: postEndpoint, environment: result.environment, cost: posted.cost, error: posted.error, cacheStatus: "miss" });
    return { ...result, cacheStatus: "miss" };
  }

  const taskId = posted.data.tasks[0].id;
  let finalData = posted.data;
  for (let attempt = 0; attempt < pollAttempts; attempt++) {
    await sleep(pollDelayMs);
    const polled = await rawRequest(getEndpointFor(taskId), undefined, "GET");
    if (polled.data && isReady(polled.data)) {
      finalData = polled.data;
      break;
    }
    finalData = polled.data ?? finalData;
  }

  const result = { data: finalData, error: null, cost: finalData?.cost ?? posted.cost, environment: liveEnabled ? "live" : "sandbox" };
  logApiUsage({ workflow, family, endpoint: postEndpoint, environment: result.environment, cost: result.cost, error: null, cacheStatus: "miss" });
  writeCache(family, key, result);
  return { ...result, cacheStatus: "miss" };
}

export function getCallCount() {
  return callCount;
}

// Low-level, uncached escape hatches for multi-step flows that don't fit the
// single-call or simple-task-poll shapes above (on_page: post -> poll a
// status endpoint -> make separate follow-up calls once ready). Callers are
// responsible for their own caching via readCache/writeCache if wanted.
export async function rawPost(endpoint, body, { workflow, family } = {}) {
  await sleep(CONFIG.requestDelayMs);
  callCount += 1;
  const result = await rawRequest(endpoint, body, "POST");
  if (workflow) logApiUsage({ workflow, family: family ?? "onpage", endpoint, environment: liveEnabled ? "live" : "sandbox", cost: result.cost, error: result.error, cacheStatus: "miss" });
  return result;
}

export async function rawGet(endpoint, { workflow, family } = {}) {
  await sleep(CONFIG.requestDelayMs);
  callCount += 1;
  const result = await rawRequest(endpoint, undefined, "GET");
  if (workflow) logApiUsage({ workflow, family: family ?? "onpage", endpoint, environment: liveEnabled ? "live" : "sandbox", cost: result.cost, error: result.error, cacheStatus: "miss" });
  return result;
}
