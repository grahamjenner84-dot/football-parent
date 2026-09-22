#!/usr/bin/env node
// Broken-link / expired-domain SEO opportunity finder for Football Parent.
// See scripts/broken-link-finder/README.md for setup and usage.
import path from "node:path";
import fs from "node:fs";
import { loadEnvLocal } from "./lib/env.mjs";
import { CONFIG } from "./config.mjs";
import { loadState, saveState } from "./lib/progress-store.mjs";
import { writeCsv } from "./lib/csv.mjs";
import { mapWithConcurrency } from "./lib/pool.mjs";
import { buildDiscoveryQueries, buildResourcePageQueries } from "./lib/discovery-queries.mjs";
import { isDenylistedDomain, isDenylistedPath, relevanceScore, isUkRelevant, registrableDomain } from "./lib/relevance-filters.mjs";
import { dataForSeoCall, setLiveEnabled, environmentBanner, getCallCount } from "./lib/dataforseo-client.mjs";
import { crawlDomainForBrokenLinks, crawlResourcePageForBrokenLinks } from "./lib/onpage.mjs";
import { fetchPageHtml, extractExternalLinks, checkLinkStatus } from "./lib/self-crawl.mjs";
import { backlinksSummary, referringDomains as referringDomainsCall, backlinksList, anchors as anchorsCall, parseSummary } from "./lib/backlinks.mjs";
import { lookupWaybackSnapshot } from "./lib/wayback.mjs";
import { checkDomain } from "./lib/domain-check.mjs";
import { matchReplacement } from "./lib/content-match.mjs";
import { computeOpportunityScore, recommendedAction } from "./lib/scoring.mjs";
import { summariseUsage } from "./lib/cache.mjs";

const REPO_ROOT = path.join(import.meta.dirname, "..", "..");
const OUTPUT_DIR = path.join(import.meta.dirname, "output");

const BROKEN_LINKS_COLUMNS = [
  "source_domain", "source_url", "source_title", "anchor_text", "broken_url",
  "broken_domain", "status", "follow_status", "link_type", "final_domain",
];

// Landing domains confirmed (by eyeballing the real Stage 11 run) to be
// legitimate, still-active large organisations/brands/services - a redirect
// landing here is a same-org rebrand or a URL-shortener hop, never a
// domain-squat/parking case, regardless of the topic-relevance score.
const KNOWN_LEGIT_LANDING_DOMAINS = new Set([
  "englandfootball.com", "wembleystadium.com", "nspcc.org.uk", "trussell.org.uk",
  "education.gov.uk", "gov.uk", "google.com", "spotify.com", "cloud.microsoft",
  "amazon.com", "gettyimages.co.uk", "gettyimages.com", "veo.com", "veo.co",
  "prodirectsport.com", "junipereducation.org", "ceopeducation.co.uk", "nhs.uk",
  "ronaldmcdonaldhouse.org.uk", "schoolsfootball.org", "mcdonalds.com",
  "beststartinlife.gov.uk", "soccer-assist.co.uk", "childcarechoices.gov.uk",
]);

// Stage 3's backlink calls cost real money per unique broken_url - only run
// them on findings with a real chance of being a genuine dead/expired
// resource, not on bot-blocked 403s, ambiguous timeouts, or the legitimate
// same-org rebrand noise a plain "domain changed" check can't distinguish.
function isHighConfidenceFinding(link) {
  if (link.link_type === "likely_expired_domain_parked") return true;
  if (link.link_type === "broken") return ["404", "410", "fetch failed"].includes(link.status);
  if (link.link_type === "redirected_unrelated_topic") return !KNOWN_LEGIT_LANDING_DOMAINS.has(link.final_domain);
  return false; // redirected_same_topic, other "broken" statuses (403/408/timeouts/etc)
}

// --- CLI args --------------------------------------------------------------
const args = process.argv.slice(2);
const flags = {
  live: args.includes("--live"),
  help: args.includes("--help") || args.includes("-h"),
  stages: (() => {
    const arg = args.find((a) => a.startsWith("--stage="));
    if (!arg) return [1, 2, 3, 4, 5, 6, 7, 8]; // stages 9-10 are opt-in only, see --help
    return arg
      .replace("--stage=", "")
      .split(",")
      .map((s) => Number(s.trim()));
  })(),
  maxDomains: (() => {
    const arg = args.find((a) => a.startsWith("--max-domains="));
    return arg ? Number(arg.replace("--max-domains=", "")) : null;
  })(),
};

if (flags.help) {
  console.log(`
Football Parent broken-link / expired-domain opportunity finder

Usage: node scripts/broken-link-finder/run.mjs [options]

  --live              Make real (chargeable) DataForSEO calls. Requires
                       DATAFORSEO_ALLOW_LIVE=true in .env.local too - without
                       both, the run stays in sandbox mode regardless.
  --stage=1,2,3       Run only the listed stages (default: 1-8).
                       Progress is saved after every stage, so a run can be
                       resumed with a narrower --stage list.
                       Stages 9-10 are opt-in (not in the default range):
                       9  = discover "useful links"/"resources" list pages
                            specifically (the actual link-rot magnets),
                            via intitle:/inurl: operators
                       10 = single-page crawl (not whole-domain) of each
                            page Stage 9 found, feeding the same
                            broken-links.csv / Stage 3+ pipeline as Stage 2
                       11 = free, DataForSEO-free re-check of Stage 9 pages -
                            catches expired-domain redirects (200/301 to an
                            unrelated site) that Stage 10's is_broken flag
                            structurally cannot (see lib/self-crawl.mjs)
  --max-domains=N     Override CONFIG.maxDomainsToCrawl for this run.
  --help              Show this message.

Output: scripts/broken-link-finder/output/{discovered-sites,broken-links,opportunities}.csv
`);
  process.exit(0);
}

loadEnvLocal(REPO_ROOT);
const liveRequested = flags.live;
const liveAllowedByEnv = (process.env.DATAFORSEO_ALLOW_LIVE || "").trim().toLowerCase() === "true";
setLiveEnabled(liveRequested && liveAllowedByEnv);
if (liveRequested && !liveAllowedByEnv) {
  console.warn("--live was passed but DATAFORSEO_ALLOW_LIVE is not 'true' in .env.local - staying in SANDBOX mode.");
}

console.log(`\n=== Football Parent broken-link opportunity finder ===`);
console.log(`Mode: ${environmentBanner()}`);
console.log(`Stages to run: ${flags.stages.join(", ")}\n`);

if (flags.maxDomains) CONFIG.maxDomainsToCrawl = flags.maxDomains;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const state = loadState();
const runStage = (n) => flags.stages.includes(n);

// ---------------------------------------------------------------------
// Stage 1: discover relevant UK youth-football websites via SERP
// ---------------------------------------------------------------------
async function stage1Discovery() {
  const queries = buildDiscoveryQueries();
  const processed = new Set(state.processedQueries ?? []);
  state.processedQueries = state.processedQueries ?? [];
  const domainMap = new Map((state.discoveredSites ?? []).map((d) => [d.domain, d]));

  let i = 0;
  for (const query of queries) {
    i += 1;
    if (processed.has(query)) {
      console.log(`Discovery query ${i}/${queries.length} (cached, skipping): "${query}"`);
      continue;
    }
    console.log(`Discovery query ${i}/${queries.length}: "${query}"`);

    const res = await dataForSeoCall({
      family: "serp",
      endpoint: "serp/google/organic/live/advanced",
      body: { keyword: query, location_code: CONFIG.locationCode, language_code: CONFIG.languageCode, device: "desktop", depth: CONFIG.serpDepth },
      workflow: "broken-link-finder",
    });

    if (res.error) {
      console.warn(`  discovery query failed: ${res.error}`);
    } else {
      const items = res.data?.tasks?.[0]?.result?.[0]?.items ?? [];
      for (const item of items) {
        if (item.type !== "organic" || !item.url || !item.domain) continue;
        if (isDenylistedDomain(item.domain)) continue;
        if (isDenylistedPath(item.url)) continue;

        const text = `${item.title ?? ""} ${item.description ?? ""}`;
        const score = relevanceScore(text);
        if (score <= 0) continue; // no relevance-keyword hit at all

        const domain = registrableDomain(item.domain);
        if (!domainMap.has(domain)) {
          if (domainMap.size >= CONFIG.maxDiscoveredDomains) continue;
          domainMap.set(domain, {
            domain,
            example_url: item.url,
            page_title: item.title ?? "",
            discovery_query: query,
            relevance_score: score,
            uk_relevance: isUkRelevant({ domain, text }),
            authority_metric: "",
            crawl_status: "pending",
          });
        } else {
          const existing = domainMap.get(domain);
          existing.relevance_score = Math.max(existing.relevance_score, score);
        }
      }
    }

    processed.add(query);
    state.processedQueries.push(query);
    state.discoveredSites = [...domainMap.values()];
    saveState(state);
  }

  console.log(`Discovery complete: ${state.discoveredSites.length} candidate domains before authority enrichment.`);

  // Authority enrichment - one cheap dataforseo_labs call per surviving domain.
  if (CONFIG.domainRankOverviewEnabled) {
    let enriched = 0;
    for (const site of state.discoveredSites) {
      if (site.authority_metric) continue; // already enriched in a prior run
      enriched += 1;
      const res = await dataForSeoCall({
        family: "labs",
        endpoint: "dataforseo_labs/google/domain_rank_overview/live",
        body: { target: site.domain, location_code: CONFIG.locationCode, language_code: CONFIG.languageCode },
        workflow: "broken-link-finder",
      });
      const metrics = res.data?.tasks?.[0]?.result?.[0]?.items?.[0]?.metrics?.organic;
      site.authority_metric = metrics ? `rank=${metrics.pos_1_10 ?? ""}, etv=${metrics.etv ?? ""}` : "unavailable";
      if (enriched % 20 === 0) {
        console.log(`  authority-enriched ${enriched}/${state.discoveredSites.length} domains`);
        saveState(state);
      }
    }
  }

  saveState(state);
  writeCsv(
    path.join(OUTPUT_DIR, "discovered-sites.csv"),
    ["domain", "example_url", "discovery_query", "relevance_score", "authority_metric", "crawl_status"],
    state.discoveredSites
  );
  console.log(`Wrote discovered-sites.csv (${state.discoveredSites.length} rows)\n`);
}

// ---------------------------------------------------------------------
// Stage 2: crawl each discovered domain for broken external links
// ---------------------------------------------------------------------
function extractEtv(authorityMetric) {
  const match = /etv=([\d.]+)/.exec(authorityMetric || "");
  return match ? Number(match[1]) : 0;
}

async function stage2Crawl() {
  const candidates = [...state.discoveredSites]
    .filter((s) => s.domain !== CONFIG.targetDomain) // never crawl ourselves
    .sort((a, b) => b.relevance_score - a.relevance_score || extractEtv(b.authority_metric) - extractEtv(a.authority_metric))
    .slice(0, CONFIG.maxDomainsToCrawl);

  const alreadyCrawled = new Set(state.crawledDomains ?? []);
  state.crawledDomains = state.crawledDomains ?? [];
  state.brokenLinks = state.brokenLinks ?? [];
  const brokenLinksSeen = new Set(state.brokenLinks.map((l) => `${l.source_url}|${l.broken_url}`));

  const todo = candidates.filter((s) => !alreadyCrawled.has(s.domain));
  console.log(`Crawling ${todo.length} domains (${candidates.length - todo.length} already cached), concurrency=${CONFIG.concurrency}`);

  let completed = candidates.length - todo.length;
  await mapWithConcurrency(todo, CONFIG.concurrency, async (site) => {
    const { links, error } = await crawlDomainForBrokenLinks(site.domain);
    completed += 1;
    console.log(`Crawling domain ${completed}/${candidates.length}: ${site.domain}${error ? ` - FAILED: ${error}` : ""}`);

    if (error) {
      site.crawl_status = `error: ${error}`;
    } else {
      site.crawl_status = links.length > 0 ? "crawled_broken_links_found" : "crawled_no_broken_links";
      let added = 0;
      for (const link of links) {
        const key = `${link.source_url}|${link.broken_url}`;
        if (brokenLinksSeen.has(key)) continue;
        brokenLinksSeen.add(key);
        state.brokenLinks.push(link);
        added += 1;
      }
      if (added > 0) console.log(`  found ${added} relevant broken link(s) on ${site.domain}`);
    }

    alreadyCrawled.add(site.domain);
    state.crawledDomains.push(site.domain);
    if (completed % 5 === 0) saveState(state); // periodic save under concurrency, not every single completion
  });

  saveState(state);
  writeCsv(
    path.join(OUTPUT_DIR, "discovered-sites.csv"),
    ["domain", "example_url", "discovery_query", "relevance_score", "authority_metric", "crawl_status"],
    state.discoveredSites
  );
  writeCsv(
    path.join(OUTPUT_DIR, "broken-links.csv"),
    BROKEN_LINKS_COLUMNS,
    state.brokenLinks
  );
  console.log(`Stage 2 complete: ${state.brokenLinks.length} broken links found across ${alreadyCrawled.size} crawled domains.\n`);
}

// ---------------------------------------------------------------------
// Stage 9 (opt-in): discover "useful links"/"resources" list pages
// specifically - the actual link-rot magnets - rather than whole domains.
// ---------------------------------------------------------------------
async function stage9ResourcePageDiscovery() {
  const queries = buildResourcePageQueries();
  const processed = new Set(state.processedResourceQueries ?? []);
  state.processedResourceQueries = state.processedResourceQueries ?? [];
  const urlMap = new Map((state.resourcePages ?? []).map((p) => [p.url, p]));

  let i = 0;
  for (const query of queries) {
    i += 1;
    if (processed.has(query)) {
      console.log(`Resource-page query ${i}/${queries.length} (cached, skipping): "${query}"`);
      continue;
    }
    console.log(`Resource-page query ${i}/${queries.length}: "${query}"`);

    const res = await dataForSeoCall({
      family: "serp",
      endpoint: "serp/google/organic/live/advanced",
      body: { keyword: query, location_code: CONFIG.locationCode, language_code: CONFIG.languageCode, device: "desktop", depth: CONFIG.serpDepth },
      workflow: "broken-link-finder",
    });

    if (res.error) {
      console.warn(`  resource-page query failed: ${res.error}`);
    } else {
      const items = res.data?.tasks?.[0]?.result?.[0]?.items ?? [];
      for (const item of items) {
        if (item.type !== "organic" || !item.url || !item.domain) continue;
        if (isDenylistedDomain(item.domain)) continue;
        if (isDenylistedPath(item.url)) continue;
        if (item.domain === CONFIG.targetDomain) continue;

        const text = `${item.title ?? ""} ${item.description ?? ""}`;
        const score = relevanceScore(text);
        if (score <= 0) continue; // still require at least one football/grassroots keyword hit

        if (!urlMap.has(item.url)) {
          if (urlMap.size >= CONFIG.maxResourcePages) continue;
          urlMap.set(item.url, {
            url: item.url,
            domain: registrableDomain(item.domain),
            page_title: item.title ?? "",
            discovery_query: query,
            relevance_score: score,
            crawl_status: "pending",
          });
        }
      }
    }

    processed.add(query);
    state.processedResourceQueries.push(query);
    state.resourcePages = [...urlMap.values()];
    saveState(state);
  }

  writeCsv(
    path.join(OUTPUT_DIR, "resource-pages.csv"),
    ["url", "domain", "discovery_query", "relevance_score", "crawl_status"],
    state.resourcePages
  );
  console.log(`Stage 9 complete: ${state.resourcePages.length} candidate resource/links pages discovered. Wrote resource-pages.csv.\n`);
}

// ---------------------------------------------------------------------
// Stage 10 (opt-in): single-page crawl (max_crawl_pages: 1) of each page
// Stage 9 found - cheap/fast per item since it's one page, not a domain -
// feeding the same state.brokenLinks / broken-links.csv as Stage 2.
// ---------------------------------------------------------------------
async function stage10CrawlResourcePages() {
  const candidates = [...(state.resourcePages ?? [])];
  const alreadyCrawled = new Set(state.resourcePagesCrawled ?? []);
  state.resourcePagesCrawled = state.resourcePagesCrawled ?? [];
  state.brokenLinks = state.brokenLinks ?? [];
  const brokenLinksSeen = new Set(state.brokenLinks.map((l) => `${l.source_url}|${l.broken_url}`));

  const todo = candidates.filter((p) => !alreadyCrawled.has(p.url));
  console.log(`Crawling ${todo.length} resource pages (${candidates.length - todo.length} already cached), concurrency=${CONFIG.concurrency}`);

  let completed = candidates.length - todo.length;
  await mapWithConcurrency(todo, CONFIG.concurrency, async (page) => {
    const { links, error } = await crawlResourcePageForBrokenLinks(page.url);
    completed += 1;
    console.log(`Crawling resource page ${completed}/${candidates.length}: ${page.url}${error ? ` - FAILED: ${error}` : ""}`);

    if (error) {
      page.crawl_status = `error: ${error}`;
    } else {
      page.crawl_status = links.length > 0 ? "crawled_broken_links_found" : "crawled_no_broken_links";
      let added = 0;
      for (const link of links) {
        const key = `${link.source_url}|${link.broken_url}`;
        if (brokenLinksSeen.has(key)) continue;
        brokenLinksSeen.add(key);
        state.brokenLinks.push(link);
        added += 1;
      }
      if (added > 0) console.log(`  found ${added} relevant broken link(s) on ${page.url}`);
    }

    alreadyCrawled.add(page.url);
    state.resourcePagesCrawled.push(page.url);
    if (completed % 5 === 0) saveState(state);
  });

  saveState(state);
  writeCsv(
    path.join(OUTPUT_DIR, "resource-pages.csv"),
    ["url", "domain", "discovery_query", "relevance_score", "crawl_status"],
    state.resourcePages
  );
  writeCsv(
    path.join(OUTPUT_DIR, "broken-links.csv"),
    BROKEN_LINKS_COLUMNS,
    state.brokenLinks
  );
  console.log(`Stage 10 complete: ${state.brokenLinks.length} total broken links now recorded across all crawling.\n`);
}

// ---------------------------------------------------------------------
// Stage 11 (opt-in): free, DataForSEO-free re-check of the Stage 9 resource
// pages. Catches what Stage 10's DataForSEO is_broken flag structurally
// can't: an expired domain that's been re-registered and now 200s/301s to
// an unrelated (often squatted/parked) site - see lib/self-crawl.mjs.
// ---------------------------------------------------------------------
async function stage11SelfCheckResourcePages() {
  const candidates = [...(state.resourcePages ?? [])];
  const alreadyChecked = new Set(state.selfCheckedPages ?? []);
  state.selfCheckedPages = state.selfCheckedPages ?? [];
  state.brokenLinks = state.brokenLinks ?? [];
  const brokenLinksSeen = new Set(state.brokenLinks.map((l) => `${l.source_url}|${l.broken_url}`));

  const todo = candidates.filter((p) => !alreadyChecked.has(p.url));
  console.log(`Self-checking ${todo.length} resource pages (${candidates.length - todo.length} already done), concurrency=${CONFIG.concurrency}`);

  let completed = candidates.length - todo.length;
  await mapWithConcurrency(todo, CONFIG.concurrency, async (page) => {
    const { html, error: fetchError } = await fetchPageHtml(page.url);
    completed += 1;

    if (fetchError) {
      console.log(`Self-checking page ${completed}/${candidates.length}: ${page.url} - FETCH FAILED: ${fetchError}`);
      alreadyChecked.add(page.url);
      state.selfCheckedPages.push(page.url);
      if (completed % 5 === 0) saveState(state);
      return;
    }

    const links = extractExternalLinks(html, page.url);
    let sourceDomain;
    try {
      sourceDomain = new URL(page.url).hostname;
    } catch {
      sourceDomain = page.domain;
    }

    let foundCount = 0;
    for (const link of links) {
      const result = await checkLinkStatus(link.url);
      if (result.status === "ok") continue;

      const key = `${page.url}|${link.url}`;
      if (brokenLinksSeen.has(key)) continue;
      brokenLinksSeen.add(key);

      state.brokenLinks.push({
        source_domain: registrableDomain(sourceDomain),
        source_url: page.url,
        source_title: page.page_title,
        anchor_text: link.anchorText,
        broken_url: link.url,
        broken_domain: link.domain,
        status: result.status === "broken" ? String(result.httpStatus ?? result.error ?? "unreachable") : `redirect->${result.finalDomain}`,
        follow_status: link.isNofollow ? "nofollow" : "dofollow",
        link_type: result.status,
        final_domain: result.finalDomain ?? "",
      });
      foundCount += 1;
    }

    console.log(`Self-checking page ${completed}/${candidates.length}: ${page.url} (${links.length} external links checked)${foundCount > 0 ? ` - found ${foundCount}` : ""}`);

    alreadyChecked.add(page.url);
    state.selfCheckedPages.push(page.url);
    if (completed % 5 === 0) saveState(state);
  });

  saveState(state);
  writeCsv(path.join(OUTPUT_DIR, "broken-links.csv"), BROKEN_LINKS_COLUMNS, state.brokenLinks);
  console.log(`Stage 11 complete: ${state.brokenLinks.length} total broken links now recorded across all crawling.\n`);
}

// ---------------------------------------------------------------------
// Stage 3 + 4: tiered backlink analysis + historical-topic recovery for
// every unique broken destination URL
// ---------------------------------------------------------------------
async function stage3And4Analyse() {
  const highConfidenceUrls = new Set(state.brokenLinks.filter(isHighConfidenceFinding).map((l) => l.broken_url));
  const uniqueBrokenUrls = [...highConfidenceUrls];
  const skippedCount = new Set(state.brokenLinks.map((l) => l.broken_url)).size - uniqueBrokenUrls.length;
  console.log(`${uniqueBrokenUrls.length} high-confidence broken URLs selected for backlink analysis (${skippedCount} lower-confidence findings skipped - see broken-links.csv for the full raw list).`);
  state.brokenResources = state.brokenResources ?? [];
  const analysed = new Map(state.brokenResources.map((r) => [r.broken_url, r]));

  let tier2Used = [...analysed.values()].filter((r) => r.tier2Ran).length;
  let i = 0;
  for (const brokenUrl of uniqueBrokenUrls) {
    i += 1;
    if (analysed.has(brokenUrl)) {
      console.log(`Analysing broken resource ${i}/${uniqueBrokenUrls.length} (cached, skipping)`);
      continue;
    }
    console.log(`Analysing broken resource ${i}/${uniqueBrokenUrls.length}: ${brokenUrl}`);

    const summaryRes = await backlinksSummary(brokenUrl);
    const summary = parseSummary(summaryRes) ?? { backlinks: 0, referringDomains: 0, rank: null };

    const resource = {
      broken_url: brokenUrl,
      broken_domain: registrableDomain(new URL(brokenUrl).hostname),
      total_backlinks: summary.backlinks,
      total_referring_domains: summary.referringDomains,
      dofollow_referring_domains: null,
      strongest_referring_domain: "",
      strongest_linking_url: "",
      anchors_sample: "",
      dofollow_ratio: null,
      tier2Ran: false,
      topic_summary: "",
      wayback_snapshot_url: "",
    };

    const meetsBar = summary.referringDomains >= CONFIG.minReferringDomains;
    if (meetsBar && tier2Used < CONFIG.backlinksTier2Limit) {
      tier2Used += 1;
      resource.tier2Ran = true;
      const [rdRes, blRes, anchorsRes] = await Promise.all([
        referringDomainsCall(brokenUrl),
        backlinksList(brokenUrl),
        anchorsCall(brokenUrl),
      ]);

      const rdItems = rdRes.data?.tasks?.[0]?.result?.[0]?.items ?? [];
      if (rdItems.length > 0) {
        const strongest = [...rdItems].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))[0];
        resource.strongest_referring_domain = strongest?.domain ?? "";
      }

      const blItems = blRes.data?.tasks?.[0]?.result?.[0]?.items ?? [];
      if (blItems.length > 0) {
        const dofollowCount = blItems.filter((b) => b.dofollow !== false).length;
        resource.dofollow_ratio = dofollowCount / blItems.length;
        resource.strongest_linking_url = blItems[0]?.url_from ?? "";
      }

      const anchorItems = anchorsRes.data?.tasks?.[0]?.result?.[0]?.items ?? [];
      resource.anchors_sample = anchorItems.slice(0, 5).map((a) => a.anchor).filter(Boolean).join(" | ");
    } else if (meetsBar) {
      console.log(`  referring-domain bar cleared but tier-2 budget (${CONFIG.backlinksTier2Limit}) exhausted this run`);
    }

    // Stage 4: recover historical topic - Wayback first, fall back to our
    // own crawl's anchor text + URL slug words.
    const wayback = await lookupWaybackSnapshot(brokenUrl);
    resource.wayback_snapshot_url = wayback.snapshotUrl ?? "";
    const ownAnchors = state.brokenLinks.filter((l) => l.broken_url === brokenUrl).map((l) => l.anchor_text).filter(Boolean).join(" ");
    const slugWords = new URL(brokenUrl).pathname.replace(/[-_/]/g, " ");
    resource.topic_summary = [wayback.title, wayback.description, ownAnchors, slugWords].filter(Boolean).join(" - ");

    analysed.set(brokenUrl, resource);
    state.brokenResources = [...analysed.values()];
    saveState(state);
  }

  console.log(`Stage 3+4 complete: ${uniqueBrokenUrls.length} unique broken resources analysed (${tier2Used} got full backlink tier).\n`);
}

// ---------------------------------------------------------------------
// Stage 5: match each broken resource against existing Football Parent content
// ---------------------------------------------------------------------
async function stage5Match() {
  for (const resource of state.brokenResources) {
    const match = matchReplacement(resource.topic_summary);
    resource.replacement_classification = match.classification;
    resource.existing_football_parent_url = match.url;
    resource.replacement_quality = match.score;
  }
  saveState(state);
  console.log(`Stage 5 complete: replacement classification assigned to ${state.brokenResources.length} resources.\n`);
}

// ---------------------------------------------------------------------
// Stage 6: check whether the broken destination domain itself looks dead
// ---------------------------------------------------------------------
async function stage6DomainCheck() {
  const domainCounts = new Map();
  for (const r of state.brokenResources) {
    domainCounts.set(r.broken_domain, (domainCounts.get(r.broken_domain) ?? 0) + 1);
  }

  const uniqueDomains = [...domainCounts.keys()];
  const results = await mapWithConcurrency(uniqueDomains, CONFIG.concurrency, async (domain) => {
    const check = await checkDomain(domain);
    return { domain, check };
  });
  const checkByDomain = new Map(results.map((r) => [r.domain, r.check]));

  // A domain that still resolves and 200s/301s is NOT "dead" by DNS/HTTP
  // standards, but if Stage 11's self-crawl already found it redirecting to
  // an unrelated domain (a squat/parking case), that's the same real-world
  // signal as a dead domain for acquisition purposes - the classic expired-
  // domain pattern is "still resolves, now points somewhere unrelated," not
  // "stopped resolving entirely." Confirmed missing on nelsonfootballclub.co.uk
  // (resolves fine, redirects to a squatted bewokwin.cc) before this fix.
  const squattedDomains = new Set(
    state.brokenLinks
      .filter((l) => l.link_type === "redirected_unrelated_topic" || l.link_type === "likely_expired_domain_parked")
      .map((l) => l.broken_domain)
  );

  for (const resource of state.brokenResources) {
    const check = checkByDomain.get(resource.broken_domain);
    const multiPageSignal = domainCounts.get(resource.broken_domain) >= 2;
    const isSquattedRedirect = squattedDomains.has(resource.broken_domain);
    const deadOrSquatted = Boolean(check?.appearsDead) || isSquattedRedirect;

    resource.domain_appears_dead = check?.appearsDead ? "yes" : "no";
    resource.domain_still_resolves = check?.resolves ? "yes" : "no";
    resource.domain_redirects_elsewhere = check?.redirectsTo || isSquattedRedirect ? "yes" : "no";
    resource.acquisition_candidate = !deadOrSquatted ? "no" : multiPageSignal || isSquattedRedirect ? "yes" : "manual_check";
    resource._acquisitionSignal = multiPageSignal || isSquattedRedirect;
    resource._domainAppearsDead = deadOrSquatted;
  }
  saveState(state);
  console.log(`Stage 6 complete: ${uniqueDomains.length} broken domains checked for liveness.\n`);
}

// ---------------------------------------------------------------------
// Stage 7 + 8: score every broken resource and write opportunities.csv
// ---------------------------------------------------------------------
async function stage7And8Score() {
  const opportunities = [];

  for (const resource of state.brokenResources) {
    const linksToThis = state.brokenLinks.filter((l) => l.broken_url === resource.broken_url);
    const ownDofollowRatio = linksToThis.length
      ? linksToThis.filter((l) => l.follow_status === "dofollow").length / linksToThis.length
      : null;
    const dofollowRatio = resource.dofollow_ratio ?? ownDofollowRatio ?? 0.5;

    const editorialScore = linksToThis.some((l) => /resources?|links|directory/i.test(`${l.source_title} ${l.source_url}`)) ? 0.6 : 1.0;

    const text = `${resource.topic_summary}`;
    const ukRelevant = linksToThis.some((l) => registrableDomain(l.source_domain).endsWith(".uk")) || /\buk\b|england|scotland|wales/i.test(text);
    // No floor here: the resource-page flow (Stage 9-11) only vetted the
    // SOURCE page's relevance (a club's "useful links" page), not each
    // individual destination link on it - a dead link to an unrelated local
    // sponsor's website is a real broken link but genuinely not football-
    // relevant, and should score as such rather than being floored up.
    const topicalRelevanceScore = relevanceScore(text);

    const score = computeOpportunityScore({
      referringDomains: resource.total_referring_domains,
      dofollowRatio,
      ukRelevant,
      topicalRelevanceScore,
      replacementClassification: resource.replacement_classification,
      editorialScore,
      sourceActive: true,
    });

    const action = recommendedAction({
      referringDomains: resource.total_referring_domains,
      replacementClassification: resource.replacement_classification,
      domainAppearsDead: resource._domainAppearsDead,
      acquisitionSignal: resource._acquisitionSignal,
    });

    opportunities.push({
      opportunity_score: score,
      broken_url: resource.broken_url,
      broken_domain: resource.broken_domain,
      old_resource_topic: resource.topic_summary.slice(0, 200),
      total_referring_domains: resource.total_referring_domains,
      quality_referring_domains: resource.tier2Ran ? resource.total_referring_domains : "not_analysed (below threshold)",
      strongest_referring_domain: resource.strongest_referring_domain,
      strongest_linking_url: resource.strongest_linking_url,
      follow_status: dofollowRatio >= 0.5 ? "mostly_dofollow" : "mostly_nofollow",
      UK_relevance: ukRelevant ? "yes" : "no",
      football_relevance: topicalRelevanceScore >= 0.5 ? "high" : topicalRelevanceScore > 0 ? "medium" : "low",
      existing_football_parent_url: resource.existing_football_parent_url,
      replacement_quality: resource.replacement_classification,
      new_article_required: resource.replacement_classification === "new_article_opportunity" ? "yes" : "no",
      acquisition_candidate: resource.acquisition_candidate,
      recommended_action: action,
    });
  }

  opportunities.sort((a, b) => b.opportunity_score - a.opportunity_score);
  state.opportunities = opportunities;
  saveState(state);

  writeCsv(
    path.join(OUTPUT_DIR, "opportunities.csv"),
    [
      "opportunity_score", "broken_url", "broken_domain", "old_resource_topic",
      "total_referring_domains", "quality_referring_domains", "strongest_referring_domain",
      "strongest_linking_url", "follow_status", "UK_relevance", "football_relevance",
      "existing_football_parent_url", "replacement_quality", "new_article_required",
      "acquisition_candidate", "recommended_action",
    ],
    opportunities
  );

  const aboveThreshold = opportunities.filter((o) => o.opportunity_score >= CONFIG.minOpportunityScore).length;
  console.log(`Stage 7+8 complete: ${opportunities.length} opportunities scored, ${aboveThreshold} at or above the suggested triage line (${CONFIG.minOpportunityScore}).\n`);
}

// ---------------------------------------------------------------------
async function main() {
  if (runStage(1)) await stage1Discovery();
  if (runStage(2)) await stage2Crawl();
  if (runStage(9)) await stage9ResourcePageDiscovery();
  if (runStage(10)) await stage10CrawlResourcePages();
  if (runStage(11)) await stage11SelfCheckResourcePages();
  if (runStage(3) || runStage(4)) await stage3And4Analyse();
  if (runStage(5)) await stage5Match();
  if (runStage(6)) await stage6DomainCheck();
  if (runStage(7) || runStage(8)) await stage7And8Score();

  const usage = summariseUsage();
  console.log(`=== Run summary ===`);
  console.log(`Mode: ${environmentBanner()}`);
  console.log(`DataForSEO calls this run: ${getCallCount()} (lifetime logged calls: ${usage.calls}, lifetime logged cost: $${usage.cost.toFixed(4)})`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
