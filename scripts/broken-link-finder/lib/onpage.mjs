// DataForSEO On-Page API - crawl a domain and pull broken external links.
//
// Endpoint shapes below are per docs.dataforseo.com/v3/on-page-overview/ at
// time of writing. They are NOT re-verified against a live call in this
// session - the first sandbox run logs the raw response shape at each step
// (see logRawShape) specifically so a mismatch is caught before any live
// (chargeable) crawl runs, per the brief's "identify expensive calls /
// avoid unnecessary crawling" requirement.
import { rawPost, rawGet } from "./dataforseo-client.mjs";
import { cacheKeyFor, readCache, writeCache } from "./cache.mjs";
import { registrableDomain, isDenylistedPath } from "./relevance-filters.mjs";
import { CONFIG } from "../config.mjs";

function logRawShape(label, data) {
  const task = data?.tasks?.[0];
  const sampleKeys = task?.result?.[0] ? Object.keys(task.result[0]) : [];
  console.log(`    [on_page raw shape] ${label}: status=${task?.status_code} result_count=${task?.result_count} sample_keys=${sampleKeys.join("|") || "(none)"}`);
}

async function postTask(target, maxCrawlPages) {
  const body = {
    target,
    max_crawl_pages: maxCrawlPages,
    load_resources: false,
    enable_javascript: false,
    respect_sitemap: true,
  };
  const posted = await rawPost("on_page/task_post", body, { workflow: "broken-link-finder", family: "onpage_task" });
  if (posted.error) return { taskId: null, error: posted.error };
  const taskId = posted.data?.tasks?.[0]?.id;
  if (!taskId) return { taskId: null, error: "task_post returned no task id" };
  return { taskId, error: null };
}

// Polls until crawl_progress is "finished" (confirmed field/value against a
// live sandbox call). If the poll budget runs out first, proceeds anyway
// with whatever's been crawled rather than discarding the domain entirely -
// on_page/links and on_page/pages both return partial results for an
// in-progress crawl.
// "Task In Queue" (seen live as task status 40602) is a transient not-ready
// state under load, same class as 20100 "Task Created" - not a real error.
// Confirmed live: with concurrency>1, several task_posts land in DataForSEO's
// queue at once and summary legitimately reports this before crawling starts.
function isTransientNotReady(error) {
  return typeof error === "string" && /task in queue/i.test(error);
}

async function pollSummary(taskId) {
  let lastData = null;
  for (let attempt = 0; attempt < CONFIG.onPagePollAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, CONFIG.onPagePollDelayMs));
    const res = await rawGet(`on_page/summary/${taskId}`, { workflow: "broken-link-finder", family: "onpage_summary" });
    if (res.error && !isTransientNotReady(res.error)) return { data: null, error: res.error };
    if (res.data) lastData = res.data;
    const progress = res.data?.tasks?.[0]?.result?.[0]?.crawl_progress;
    if (progress === "finished") return { data: res.data, error: null };
  }
  console.warn(`    on_page crawl for task ${taskId} not finished after ${CONFIG.onPagePollAttempts} polls - proceeding with partial results`);
  return { data: lastData, error: null };
}

async function fetchLinks(taskId) {
  const body = { id: taskId, limit: 1000, filters: [["is_broken", "=", true]] };
  const res = await rawPost("on_page/links", body, { workflow: "broken-link-finder", family: "onpage_links" });
  if (res.error) {
    // Filter field name unconfirmed live - retry once unfiltered and filter
    // client-side rather than losing the whole domain's results.
    console.warn(`    [on_page/links] filtered request failed (${res.error}), retrying unfiltered`);
    const fallback = await rawPost("on_page/links", { id: taskId, limit: 1000 }, { workflow: "broken-link-finder", family: "onpage_links" });
    return fallback;
  }
  return res;
}

async function fetchPages(taskId) {
  return rawPost("on_page/pages", { id: taskId, limit: 1000 }, { workflow: "broken-link-finder", family: "onpage_pages" });
}

function extractBrokenExternalLinks(linksData, pagesData, sourceDomain) {
  const pageTitleByUrl = new Map();
  for (const page of pagesData?.tasks?.[0]?.result?.[0]?.items ?? []) {
    if (page?.url) pageTitleByUrl.set(page.url, page.meta?.title ?? page.title ?? "");
  }

  const items = linksData?.data?.tasks?.[0]?.result?.[0]?.items ?? [];
  const out = [];
  for (const link of items) {
    // Confirmed against a live sandbox on_page/links call: link_from/link_to
    // are full URLs, page_from/page_to are path-only and NOT safe as a
    // fallback here (a bare "/" is not a usable source_url).
    const destUrl = link.link_to || link.url_to;
    const srcUrl = link.link_from || link.url_from;
    if (!destUrl || !srcUrl) continue;

    let destHost;
    try {
      destHost = new URL(destUrl).hostname;
    } catch {
      continue;
    }
    const isExternal = registrableDomain(destHost) !== registrableDomain(sourceDomain);
    if (!isExternal) continue;

    const statusCode = link.page_to_status_code ?? link.status_code ?? null;
    const isBroken = link.is_broken === true || (typeof statusCode === "number" && (statusCode === 0 || statusCode >= 400));
    if (!isBroken) continue;

    if (isDenylistedPath(srcUrl)) continue; // nav/footer-pattern URL, not editorial content

    out.push({
      source_domain: sourceDomain,
      source_url: srcUrl,
      source_title: pageTitleByUrl.get(srcUrl) ?? "",
      anchor_text: link.anchor ?? link.text ?? "",
      broken_url: destUrl,
      broken_domain: registrableDomain(destHost),
      status: statusCode ?? "unreachable",
      follow_status: link.dofollow === false ? "nofollow" : "dofollow",
      link_direction: link.direction ?? "external",
      link_type: "hard_broken",
      final_domain: registrableDomain(destHost),
    });
  }
  return out;
}

// Crawl one target (a bare domain for a whole-site crawl, or a specific page
// URL for a single-page crawl - see maxCrawlPages) and return its broken
// external links (editorial-context ones only - denylisted paths like
// /forum/, /login already excluded).
async function crawlTargetForBrokenLinks(target, maxCrawlPages) {
  const cacheKey = cacheKeyFor("onpage_result", { target, maxPages: maxCrawlPages });
  const cached = readCache("onpage_result", cacheKey, CONFIG.cacheTtlDays.onpage_task);
  if (cached) return { ...cached, cacheStatus: "hit" };

  const sourceDomain = (() => {
    try {
      return new URL(target.startsWith("http") ? target : `https://${target}`).hostname;
    } catch {
      return target;
    }
  })();

  const { taskId, error: postError } = await postTask(target, maxCrawlPages);
  if (postError) return { links: [], error: postError, cacheStatus: "miss" };

  const { data: summaryData, error: summaryError } = await pollSummary(taskId);
  if (summaryError) return { links: [], error: summaryError, cacheStatus: "miss" };
  logRawShape(`summary(${target})`, summaryData);

  const [linksResult, pagesResult] = await Promise.all([fetchLinks(taskId), fetchPages(taskId)]);
  if (linksResult.error) {
    logRawShape(`links(${target}) ERROR`, linksResult.data);
    return { links: [], error: linksResult.error, cacheStatus: "miss" };
  }
  logRawShape(`links(${target})`, linksResult.data);

  const links = extractBrokenExternalLinks(linksResult, pagesResult.data, sourceDomain);
  const result = { links, error: null };
  writeCache("onpage_result", cacheKey, result);
  return { ...result, cacheStatus: "miss" };
}

export function crawlDomainForBrokenLinks(domain) {
  return crawlTargetForBrokenLinks(domain, CONFIG.maxCrawlPagesPerDomain);
}

// Single-page crawl (max_crawl_pages: 1) for a specific resource/links-list
// page found by Stage 1b - much cheaper and faster than a whole-domain
// crawl, and targets exactly the page type where link rot accumulates.
export function crawlResourcePageForBrokenLinks(url) {
  return crawlTargetForBrokenLinks(url, 1);
}
