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
  // Task-based endpoints on the standard queue can take minutes. The client's
  // default poll (5 x 1.5s) gives up long before that, and a not-ready task is
  // cached as "partial", so callers of the task endpoints below should pass a
  // longer poll.
  pollAttempts?: number;
  pollDelayMs?: number;
};

type AppTaskSpec = { endpoint: string; postEndpoint: string; getBase: string; body: Record<string, unknown>; seed: string };

function appTask(spec: AppTaskSpec, opts: AppDataOptions): Promise<DataForSeoResult> {
  const body = {
    ...spec.body,
    location_code: opts.locationCode ?? DEFAULT_LOCATION_CODE,
    language_code: opts.languageCode ?? DEFAULT_LANGUAGE_CODE,
  };
  return dataForSeoTaskRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "app_data",
    endpoint: spec.endpoint,
    postEndpoint: spec.postEndpoint,
    getEndpointFor: (id) => `${spec.getBase}/${id}`,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [spec.seed],
    locationCode: body.location_code,
    languageCode: body.language_code,
    pollAttempts: opts.pollAttempts,
    pollDelayMs: opts.pollDelayMs,
  });
}

// One app's store listing: Google Play returns installs (a range and a
// count), rating and review count. Task-based.
export function googlePlayAppInfo(appId: string, opts: AppDataOptions): Promise<DataForSeoResult> {
  return appTask(
    {
      endpoint: "app_data/google/app_info",
      postEndpoint: "app_data/google/app_info/task_post",
      getBase: "app_data/google/app_info/task_get/advanced",
      body: { app_id: appId },
      seed: appId,
    },
    opts
  );
}

// App Store listing: rating and review count. Apple publishes no download
// figures, so there is no installs field to get. Task-based.
export function appleAppInfo(appId: string, opts: AppDataOptions): Promise<DataForSeoResult> {
  return appTask(
    {
      endpoint: "app_data/apple/app_info",
      postEndpoint: "app_data/apple/app_info/task_post",
      getBase: "app_data/apple/app_info/task_get/advanced",
      body: { app_id: appId },
      seed: appId,
    },
    opts
  );
}

// Apps ranking in App Store search for a keyword (in-store ranking, not
// Google web search). Task-based.
export function appleAppSearches(keyword: string, opts: AppDataOptions & { depth?: number }): Promise<DataForSeoResult> {
  return appTask(
    {
      endpoint: "app_data/apple/app_searches",
      postEndpoint: "app_data/apple/app_searches/task_post",
      getBase: "app_data/apple/app_searches/task_get/advanced",
      body: { keyword, depth: opts.depth ?? 30 },
      seed: keyword,
    },
    opts
  );
}

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
    pollAttempts: opts.pollAttempts,
    pollDelayMs: opts.pollDelayMs,
  });
}

// Reviews, newest first. Google bills per 150 reviews (depth should be a
// multiple of 150), Apple per 25. Task-based; pass a long poll.
export function googlePlayAppReviews(appId: string, opts: AppDataOptions & { depth?: number }): Promise<DataForSeoResult> {
  return appTask(
    {
      endpoint: "app_data/google/app_reviews",
      postEndpoint: "app_data/google/app_reviews/task_post",
      getBase: "app_data/google/app_reviews/task_get/advanced",
      body: { app_id: appId, depth: opts.depth ?? 150, sort_by: "newest" },
      seed: appId,
    },
    opts
  );
}

export function appleAppReviews(appId: string, opts: AppDataOptions & { depth?: number }): Promise<DataForSeoResult> {
  return appTask(
    {
      endpoint: "app_data/apple/app_reviews",
      postEndpoint: "app_data/apple/app_reviews/task_post",
      getBase: "app_data/apple/app_reviews/task_get/advanced",
      body: { app_id: appId, depth: opts.depth ?? 100, sort_by: "most_recent" },
      seed: appId,
    },
    opts
  );
}
