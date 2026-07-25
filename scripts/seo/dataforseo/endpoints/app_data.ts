// app_data - Google Play / Apple App Store search data, for the coaching-app
// product workflows. Most app_data endpoints are task-based (task_post +
// task_get); app_listings/search has a /live variant, used here as the
// default entry point since it needs no polling. Paths confirmed against
// docs.dataforseo.com/v3/app_data-overview/.
import { dataForSeoRequest, dataForSeoTaskRequest, type DataForSeoResult } from "../client";
import { DEFAULT_LOCATION_CODE, DEFAULT_LANGUAGE_CODE } from "../../shared/normalise";
import type { DataForSeoEnvironment } from "../../shared/env";

const API_FAMILY = "app_data";

export type AppDataOptions = {
  workflow: string;
  locationCode?: number;
  languageCode?: string;
  environment?: DataForSeoEnvironment;
  confirmLive?: boolean;
  limit?: number;
};

export function googlePlayAppListingsSearch(keyword: string, opts: AppDataOptions): Promise<DataForSeoResult> {
  const endpoint = "app_data/google/app_listings/search/live";
  const body = {
    keyword,
    location_code: opts.locationCode ?? DEFAULT_LOCATION_CODE,
    language_code: opts.languageCode ?? DEFAULT_LANGUAGE_CODE,
    limit: opts.limit ?? 20,
  };
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "app_data",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [keyword],
    locationCode: body.location_code,
    languageCode: body.language_code,
    limit: body.limit,
  });
}

export function appleAppListingsSearch(keyword: string, opts: AppDataOptions): Promise<DataForSeoResult> {
  const endpoint = "app_data/apple/app_listings/search/live";
  const body = {
    keyword,
    location_code: opts.locationCode ?? DEFAULT_LOCATION_CODE,
    language_code: opts.languageCode ?? DEFAULT_LANGUAGE_CODE,
    limit: opts.limit ?? 20,
  };
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "app_data",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [keyword],
    locationCode: body.location_code,
    languageCode: body.language_code,
    limit: body.limit,
  });
}

// Task-based: how often a term is searched within the Google Play store
// itself (app-store keyword demand, distinct from general Google web
// search demand - see task brief's "do not treat app-store keyword ranking
// as identical to Google web-search demand").
export function googlePlayAppSearches(keyword: string, opts: AppDataOptions): Promise<DataForSeoResult> {
  const endpoint = "app_data/google/app_searches";
  const body = {
    keyword,
    location_code: opts.locationCode ?? DEFAULT_LOCATION_CODE,
    language_code: opts.languageCode ?? DEFAULT_LANGUAGE_CODE,
  };
  return dataForSeoTaskRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "app_data",
    endpoint,
    postEndpoint: "app_data/google/app_searches/task_post",
    getEndpointFor: (id) => `app_data/google/app_searches/task_get/advanced/${id}`,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [keyword],
    locationCode: body.location_code,
    languageCode: body.language_code,
  });
}
