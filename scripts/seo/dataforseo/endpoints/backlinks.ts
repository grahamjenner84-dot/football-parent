// backlinks - all /live endpoints. Paths confirmed against
// docs.dataforseo.com/v3/backlinks-overview/. Kept deliberately narrow:
// domain/page intersection first (competitor overlap), not a full
// unfiltered backlinks export, per the task brief's backlink guidance.
import { dataForSeoRequest, type DataForSeoResult } from "../client";
import type { DataForSeoEnvironment } from "../../shared/env";

const API_FAMILY = "backlinks";

export type BacklinksOptions = {
  workflow: string;
  environment?: DataForSeoEnvironment;
  confirmLive?: boolean;
  limit?: number;
};

// Domains linking to any of the competitor targets but not to Football
// Parent - the primary "backlink opportunities" entry point.
export function domainIntersection(
  targets: [string, string, ...string[]],
  opts: BacklinksOptions
): Promise<DataForSeoResult> {
  const endpoint = "backlinks/domain_intersection/live";
  // targets is an object with sequential numeric-string keys mapping to
  // plain domain strings (max 20) - not domain->object, confirmed against
  // the real sandbox after an initial wrong guess returned "Invalid Field:
  // 'targets'".
  const body = { targets: Object.fromEntries(targets.map((t, i) => [String(i + 1), t])), limit: opts.limit ?? 100 };
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "backlinks",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: targets,
    limit: body.limit,
  });
}

// Pages linking to a specific competitor page but not to a specific
// Football Parent page - narrower than domain_intersection, used once a
// specific competitor article is identified as a link magnet.
export function pageIntersection(
  targetPages: [string, string, ...string[]],
  opts: BacklinksOptions
): Promise<DataForSeoResult> {
  const endpoint = "backlinks/page_intersection/live";
  const body = { targets: Object.fromEntries(targetPages.map((t, i) => [String(i + 1), t])), limit: opts.limit ?? 100 };
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "backlinks",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: targetPages,
    limit: body.limit,
  });
}

export function referringDomains(target: string, opts: BacklinksOptions): Promise<DataForSeoResult> {
  const endpoint = "backlinks/referring_domains/live";
  const body = { target, limit: opts.limit ?? 100 };
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "backlinks",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [target],
    limit: body.limit,
  });
}

export function competitorsBacklinks(target: string, opts: BacklinksOptions): Promise<DataForSeoResult> {
  const endpoint = "backlinks/competitors/live";
  const body = { target, limit: opts.limit ?? 20 };
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "backlinks",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [target],
    limit: body.limit,
  });
}

export function anchors(target: string, opts: BacklinksOptions): Promise<DataForSeoResult> {
  const endpoint = "backlinks/anchors/live";
  const body = { target, limit: opts.limit ?? 100 };
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "backlinks",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [target],
    limit: body.limit,
  });
}

// Screening-only authority metric for a batch of prospect domains - treat
// as a signal, never an absolute quality measure (per task brief).
export function bulkRanks(targets: string[], opts: BacklinksOptions): Promise<DataForSeoResult> {
  const endpoint = "backlinks/bulk_ranks/live";
  const body = { targets };
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "backlinks",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: targets,
  });
}
