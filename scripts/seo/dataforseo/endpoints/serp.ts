// SERP - Google Organic, Live Advanced. Priced per-request and scales with
// depth ($0.002/SERP at depth 10, multiplying per extra 10 results - see
// dataforseo.com/pricing/google-serp/google-organic-serp-api), unlike
// keywords_data's flat per-request price, so unlike the search_volume
// calls this endpoint is genuinely one request per keyword - there's no
// batching multiple keywords into a single SERP request.
import { dataForSeoRequest, type DataForSeoResult } from "../client";
import { DEFAULT_LOCATION_CODE, DEFAULT_LANGUAGE_CODE } from "../../shared/normalise";
import type { DataForSeoEnvironment } from "../../shared/env";

const API_FAMILY = "serp";

export type SerpOptions = {
  workflow: string;
  locationCode?: number;
  languageCode?: string;
  device?: "desktop" | "mobile";
  depth?: number;
  environment?: DataForSeoEnvironment;
  confirmLive?: boolean;
};

export function googleOrganicSerp(keyword: string, opts: SerpOptions): Promise<DataForSeoResult> {
  const endpoint = "serp/google/organic/live/advanced";
  const body = {
    keyword,
    location_code: opts.locationCode ?? DEFAULT_LOCATION_CODE,
    language_code: opts.languageCode ?? DEFAULT_LANGUAGE_CODE,
    device: opts.device ?? "desktop",
    depth: opts.depth ?? 100,
  };
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "competitor_rankings",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [keyword],
    locationCode: body.location_code,
    languageCode: body.language_code,
    limit: body.depth,
  });
}
