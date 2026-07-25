export type DataForSeoEnvironment = "sandbox" | "live";

// Freshness families referenced by scripts/seo/dataforseo/cache.ts. Kept as
// an explicit label passed by the caller (rather than inferred from the
// endpoint path) because the same endpoint can serve different purposes -
// e.g. ranked_keywords used for competitor tracking (30 days) vs discovery
// (90 days) - and only the caller knows which.
export type CacheFamily =
  | "gsc"
  | "google_ads_volume"
  | "keyword_difficulty"
  | "search_intent"
  | "keyword_discovery"
  | "monthly_search_history"
  | "trends"
  | "competitor_rankings"
  | "backlinks"
  | "app_data";

export const CACHE_FRESHNESS_DAYS: Record<CacheFamily, number> = {
  gsc: 7,
  google_ads_volume: 90,
  keyword_difficulty: 90,
  search_intent: 180,
  keyword_discovery: 90,
  monthly_search_history: 90,
  trends: 30,
  competitor_rankings: 30,
  backlinks: 30,
  app_data: 30,
};
