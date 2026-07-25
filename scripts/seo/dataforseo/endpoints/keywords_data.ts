// keywords_data - Google Ads search volume (the canonical volume source)
// and Google Trends explore (task-based). Paths confirmed against
// docs.dataforseo.com/v3/keywords-data-endpoints/.
import { dataForSeoRequest, dataForSeoTaskRequest, type DataForSeoResult } from "../client";
import { DEFAULT_LOCATION_CODE, DEFAULT_LANGUAGE_CODE } from "../../shared/normalise";
import type { DataForSeoEnvironment } from "../../shared/env";

const API_FAMILY = "keywords_data";

export type KeywordsDataOptions = {
  workflow: string;
  locationCode?: number;
  languageCode?: string;
  environment?: DataForSeoEnvironment;
  confirmLive?: boolean;
};

// Google Ads search volume + CPC + competition for a batch of keywords.
// This is the authoritative volume figure (vs. Labs' own-index estimates).
export function googleAdsSearchVolume(keywords: string[], opts: KeywordsDataOptions): Promise<DataForSeoResult> {
  const endpoint = "keywords_data/google_ads/search_volume/live";
  const body = {
    keywords,
    location_code: opts.locationCode ?? DEFAULT_LOCATION_CODE,
    language_code: opts.languageCode ?? DEFAULT_LANGUAGE_CODE,
  };
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

// Google Trends interest-over-time + rising related queries for up to 5
// comparable terms (batch, per the task brief's "batch comparable terms
// where supported" - do not compare unrelated terms just to save requests).
export function googleTrendsExplore(keywords: string[], opts: KeywordsDataOptions): Promise<DataForSeoResult> {
  const endpoint = "keywords_data/google_trends/explore";
  const body = {
    keywords,
    location_code: opts.locationCode ?? DEFAULT_LOCATION_CODE,
    language_code: opts.languageCode ?? DEFAULT_LANGUAGE_CODE,
  };
  return dataForSeoTaskRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "trends",
    endpoint,
    postEndpoint: "keywords_data/google_trends/explore/task_post",
    getEndpointFor: (id) => `keywords_data/google_trends/explore/task_get/${id}`,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: keywords,
    locationCode: body.location_code,
    languageCode: body.language_code,
  });
}
