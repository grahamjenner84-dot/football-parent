// On-Page - Content Parsing, Live. DataForSEO fetches the page on its own
// servers and returns the parsed text, headings and links, so a caller
// (scripts/outreach/research.ts) can read a prospect page without this
// environment ever connecting to that site: the only host it talks to is
// api.dataforseo.com. That's what lets the outreach research run on a
// Custom network allowlist rather than full internet access.
//
// Priced per page, with JavaScript rendering costing more - only request it
// when a plain fetch comes back empty (JS-built club sites).
import { dataForSeoRequest, type DataForSeoResult } from "../client";
import type { DataForSeoEnvironment } from "../../shared/env";

const API_FAMILY = "on_page";

export type ContentParsingOptions = {
  workflow: string;
  enableJavascript?: boolean;
  environment?: DataForSeoEnvironment;
  confirmLive?: boolean;
  forceRefresh?: boolean;
};

// On-Page - Instant Pages. Same no-direct-fetch property as content parsing,
// but returns the on-page SEO fields content parsing leaves out: meta title,
// meta description, h1-h6 and word count. It does not list schema types.
export function instantPages(url: string, opts: ContentParsingOptions): Promise<DataForSeoResult> {
  const endpoint = "on_page/instant_pages";
  const body: Record<string, unknown> = { url };
  if (opts.enableJavascript) body.enable_javascript = true;
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "page_content",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    forceRefresh: opts.forceRefresh,
    seedTerms: [url],
  });
}

export function contentParsingLive(url: string, opts: ContentParsingOptions): Promise<DataForSeoResult> {
  const endpoint = "on_page/content_parsing/live";
  const body: Record<string, unknown> = { url };
  if (opts.enableJavascript) body.enable_javascript = true;
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "page_content",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    forceRefresh: opts.forceRefresh,
    seedTerms: [url],
  });
}
