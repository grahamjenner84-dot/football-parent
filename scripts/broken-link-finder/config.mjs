// Central configuration. Edit these values directly rather than scattering
// magic numbers through the stage scripts - this is the single place to
// tune cost/scope before a run.

export const CONFIG = {
  // --- Target site -------------------------------------------------------
  targetDomain: "footballparent.co.uk",
  targetSiteUrl: "https://www.footballparent.co.uk",

  // --- Geography -----------------------------------------------------------
  country: "United Kingdom",
  locationCode: 2826, // DataForSEO/Google Ads geo target for United Kingdom
  languageCode: "en",

  // --- Stage 1: discovery ---------------------------------------------------
  maxDiscoveredDomains: 250, // soft cap, not a hard stop at 100
  serpDepth: 30, // organic results considered per discovery query
  domainRankOverviewEnabled: true, // one dataforseo_labs call per surviving domain

  // --- Stage 2: on-page crawl (the main cost driver) ------------------------
  maxDomainsToCrawl: 200, // cap even if Stage 1 discovers more
  maxCrawlPagesPerDomain: 60,
  onPageCrawlDelayMs: 1, // per-page delay DataForSEO's crawler uses, kept low - budget is pages not time
  onPagePollAttempts: 40,
  onPagePollDelayMs: 5000,

  // --- Stage 3: backlink analysis (tiered - cheap screen, then deep dive) ---
  minReferringDomains: 3, // below this, a broken URL is skipped before any deep backlink call
  backlinksTier2Limit: 80, // hard cap on how many broken URLs get the full (expensive) treatment per run
  backlinksListLimit: 50, // rows pulled from backlinks/backlinks/live per qualifying URL
  referringDomainsLimit: 50,

  // --- Stage 4: Wayback Machine (free) --------------------------------------
  waybackEnabled: true,
  waybackTimeoutMs: 8000,

  // --- Stage 5: replacement matching -----------------------------------------
  contentDir: "content",

  // --- Stages 9-10: resource/links-list-page targeted discovery (opt-in,
  // not part of the default --stage=all run - see README) -------------------
  maxResourcePages: 150,
  resourcePageCrawlMaxPages: 1, // single-page crawl, not a whole-domain crawl

  // --- Stage 11: free self-crawl link check (no DataForSEO - see
  // lib/self-crawl.mjs for why this exists alongside Stage 10) -------------
  linkCheckTimeoutMs: 10000,

  // --- Stage 7: scoring / thresholds -----------------------------------------
  minOpportunityScore: 20, // opportunities.csv still contains everything scored,
  // but this is the suggested triage line - see run.mjs summary output.
  // Recalibrated after the relevance-gated scoring fix (see scoring.mjs) -
  // real, useful finds on a live run scored 20-40, not 40-100.

  // --- Networking / resilience -------------------------------------------
  concurrency: 3,
  maxRetries: 3,
  retryBackoffMs: 1500,
  requestDelayMs: 400, // baseline pacing between DataForSEO calls within a stage

  // --- Cache freshness (days) -------------------------------------------
  cacheTtlDays: {
    serp: 30,
    labs: 30,
    onpage_task: 14,
    onpage_pages: 14,
    onpage_links: 14,
    backlinks: 21,
    wayback: 90,
    domain_check: 7,
  },
};

// Domains excluded outright from discovery, regardless of relevance keywords.
// Matched against the registrable domain (e.g. "facebook.com"), not full host.
export const DOMAIN_DENYLIST = [
  "facebook.com", "twitter.com", "x.com", "instagram.com", "tiktok.com",
  "youtube.com", "linkedin.com", "pinterest.com", "reddit.com", "threads.net",
  "amazon.co.uk", "amazon.com", "ebay.co.uk", "ebay.com",
  "wikipedia.org", "wikihow.com",
  "bet365.com", "betfair.com", "skybet.com", "williamhill.com", "paddypower.com", "ladbrokes.com",
  "yell.com", "yelp.com", "trustpilot.com", "indeed.com", "linktr.ee",
  "medium.com", "blogspot.com", "wordpress.com", "wixsite.com", "weebly.com",
  "google.com", "bing.com",
];

// Path/host substrings that mark a result as low-value even on an otherwise
// acceptable domain (forum thread, login wall, generic directory listing).
export const PATH_DENY_PATTERNS = [
  /\/forum\//i, /\/forums\//i, /\/login\b/i, /\/signin\b/i,
  /\/tag\//i, /\/category\/page\//i, /\?s=/i,
];

// Words that, if present in a discovered page's title/snippet, count toward
// UK-youth-football relevance. Used for a lightweight relevance score, not
// as a hard filter on their own.
export const RELEVANCE_KEYWORDS = [
  "grassroots football", "youth football", "junior football", "children's football",
  "childrens football", "kids football", "football academy", "academy trials",
  "football coaching", "development centre", "development centres",
  "county fa", "county football association", "football club", "youth league",
  "football charity", "parent", "parents", "u9", "u10", "u11", "u12", "u13", "u14",
  "u15", "u16", "grassroots", "mini soccer", "5-a-side", "7-a-side", "9-a-side",
  "fa coaching", "uefa", "the fa", "girls football", "girls' football",
];
