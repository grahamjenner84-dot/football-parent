// DataForSEO Labs (dataforseo_labs) - keyword research and competitor
// research, all /live endpoints (single POST, instant result, no
// task_post/task_get). Paths confirmed against docs.dataforseo.com/v3/
// dataforseo_labs-overview/ rather than guessed.
import { dataForSeoRequest, type DataForSeoResult } from "../client";
import { DEFAULT_LOCATION_CODE, DEFAULT_LANGUAGE_CODE } from "../../shared/normalise";
import type { DataForSeoEnvironment } from "../../shared/env";

const API_FAMILY = "dataforseo_labs";

export type LabsCommonOptions = {
  workflow: string;
  locationCode?: number;
  languageCode?: string;
  environment?: DataForSeoEnvironment;
  confirmLive?: boolean;
  limit?: number;
};

function baseBody(opts: LabsCommonOptions, extra: Record<string, unknown>) {
  return {
    location_code: opts.locationCode ?? DEFAULT_LOCATION_CODE,
    language_code: opts.languageCode ?? DEFAULT_LANGUAGE_CODE,
    limit: opts.limit ?? 100,
    ...extra,
  };
}

// Close long-tail variants of a single seed keyword - the first thing to
// check for an existing article ("existing, new terms" workflow).
export function keywordSuggestions(seedKeyword: string, opts: LabsCommonOptions): Promise<DataForSeoResult> {
  const endpoint = "dataforseo_labs/google/keyword_suggestions/live";
  const body = baseBody(opts, { keyword: seedKeyword });
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "keyword_discovery",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [seedKeyword],
    locationCode: body.location_code,
    languageCode: body.language_code,
    limit: body.limit,
  });
}

// Related-search connections for one or more seed keywords.
export function relatedKeywords(seedKeyword: string, opts: LabsCommonOptions): Promise<DataForSeoResult> {
  const endpoint = "dataforseo_labs/google/related_keywords/live";
  const body = baseBody(opts, { keyword: seedKeyword });
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "keyword_discovery",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [seedKeyword],
    locationCode: body.location_code,
    languageCode: body.language_code,
    limit: body.limit,
  });
}

// Broader adjacent opportunities from up to several seed keywords - the
// main "new, new terms" discovery endpoint.
export function keywordIdeas(seedKeywords: string[], opts: LabsCommonOptions): Promise<DataForSeoResult> {
  const endpoint = "dataforseo_labs/google/keyword_ideas/live";
  const body = baseBody(opts, { keywords: seedKeywords });
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "keyword_discovery",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: seedKeywords,
    locationCode: body.location_code,
    languageCode: body.language_code,
    limit: body.limit,
  });
}

// Keywords a target site/page already ranks for, DataForSEO's own index -
// useful for "existing, existing terms" cross-checks against GSC.
export function keywordsForSite(target: string, opts: LabsCommonOptions): Promise<DataForSeoResult> {
  const endpoint = "dataforseo_labs/google/keywords_for_site/live";
  const body = baseBody(opts, { target });
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "keyword_discovery",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [target],
    locationCode: body.location_code,
    languageCode: body.language_code,
    limit: body.limit,
  });
}

// Bulk keyword difficulty for a shortlist (enrich only the shortlist, never
// the raw discovery firehose - see the task brief's discover -> dedupe ->
// shortlist -> enrich sequence).
export function bulkKeywordDifficulty(keywords: string[], opts: LabsCommonOptions): Promise<DataForSeoResult> {
  const endpoint = "dataforseo_labs/google/bulk_keyword_difficulty/live";
  const body = baseBody(opts, { keywords });
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "keyword_difficulty",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: keywords,
    locationCode: body.location_code,
    languageCode: body.language_code,
  });
}

export function searchIntent(keywords: string[], opts: LabsCommonOptions): Promise<DataForSeoResult> {
  const endpoint = "dataforseo_labs/google/search_intent/live";
  const body = baseBody(opts, { keywords });
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "search_intent",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: keywords,
    locationCode: body.location_code,
    languageCode: body.language_code,
  });
}

// Full metrics overview (volume, CPC, competition, trend) for a shortlist.
export function keywordOverview(keywords: string[], opts: LabsCommonOptions): Promise<DataForSeoResult> {
  const endpoint = "dataforseo_labs/google/keyword_overview/live";
  const body = baseBody(opts, { keywords });
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "google_ads_volume",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: keywords,
    locationCode: body.location_code,
    languageCode: body.language_code,
  });
}

// Aggregated organic/paid traffic overview for a whole domain (total ranked
// keyword count, estimated traffic value "etv", SERP position distribution)
// - one cheap call per domain, used for "how much total search traffic does
// this competitor domain get" scale comparisons rather than pulling every
// individual ranked keyword.
export function domainRankOverview(target: string, opts: LabsCommonOptions): Promise<DataForSeoResult> {
  const endpoint = "dataforseo_labs/google/domain_rank_overview/live";
  const body = baseBody(opts, { target });
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "competitor_rankings",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [target],
    locationCode: body.location_code,
    languageCode: body.language_code,
  });
}

// Discovers domains that rank for the same keywords as a target site
// (organic keyword overlap), not a curated/guessed list - the actual "who
// else competes in this niche" tool. excludeTopDomains filters out huge
// generic sites (Wikipedia, YouTube, etc.) that technically share a handful
// of keywords but aren't real niche competitors.
export function competitorsDomain(
  target: string,
  opts: LabsCommonOptions & { excludeTopDomains?: boolean }
): Promise<DataForSeoResult> {
  const endpoint = "dataforseo_labs/google/competitors_domain/live";
  const body = baseBody(opts, { target, exclude_top_domains: opts.excludeTopDomains ?? true });
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "competitor_rankings",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [target],
    locationCode: body.location_code,
    languageCode: body.language_code,
    limit: body.limit,
  });
}

// Competitor's ranked keywords - used for backlink-target discovery and
// competitor content-gap analysis. cacheFamily is caller-supplied because
// the same endpoint serves two different freshness purposes.
export function rankedKeywords(
  target: string,
  opts: LabsCommonOptions & { cacheFamily?: "keyword_discovery" | "competitor_rankings" }
): Promise<DataForSeoResult> {
  const endpoint = "dataforseo_labs/google/ranked_keywords/live";
  const body = baseBody(opts, { target });
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: opts.cacheFamily ?? "competitor_rankings",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [target],
    locationCode: body.location_code,
    languageCode: body.language_code,
    limit: body.limit,
  });
}
