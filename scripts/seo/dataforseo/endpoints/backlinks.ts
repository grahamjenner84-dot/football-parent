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

// Domains linking to ALL of `targets` (a true intersection - e.g. targets:
// [teamstats.net, footballparent.co.uk] returns only domains linking to
// BOTH, which is a small, different thing from "backlink opportunities").
// Pass `excludeTargets` to get the actual opportunity list: domains linking
// to `targets` that do NOT also link to any domain in excludeTargets - e.g.
// targets: [teamstats.net], excludeTargets: [footballparent.co.uk] returns
// domains linking to the competitor but not to us yet.
export function domainIntersection(
  targets: [string, ...string[]],
  opts: BacklinksOptions & { excludeTargets?: string[] }
): Promise<DataForSeoResult> {
  const endpoint = "backlinks/domain_intersection/live";
  // targets is an object with sequential numeric-string keys mapping to
  // plain domain strings (max 20) - not domain->object, confirmed against
  // the real sandbox after an initial wrong guess returned "Invalid Field:
  // 'targets'".
  const body: Record<string, unknown> = {
    targets: Object.fromEntries(targets.map((t, i) => [String(i + 1), t])),
    limit: opts.limit ?? 100,
  };
  if (opts.excludeTargets && opts.excludeTargets.length > 0) body.exclude_targets = opts.excludeTargets;
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "backlinks",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: targets,
    limit: body.limit as number,
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

// Individual backlink records (not just domain-level counts) - the only way
// to see a specific link's current attributes: dofollow/nofollow, url_from,
// anchor, first_seen (when DataForSEO's crawler first found this exact
// link), last_seen (most recent recrawl confirming the attributes below are
// still current). There is no attribute-level change history in this API -
// first_seen/last_seen tell you the link has existed and was last
// reconfirmed on those dates, not the date any single attribute (like
// dofollow) flipped. Pinning down exactly when a rel attribute changed
// requires an external source (e.g. Wayback Machine snapshots of url_from).
export function backlinksList(
  target: string,
  opts: BacklinksOptions & { filters?: unknown[]; backlinksStatusType?: "all" | "live" | "lost" }
): Promise<DataForSeoResult> {
  const endpoint = "backlinks/backlinks/live";
  const body: Record<string, unknown> = {
    target,
    mode: "as_is",
    limit: opts.limit ?? 100,
    backlinks_status_type: opts.backlinksStatusType ?? "live",
  };
  if (opts.filters) body.filters = opts.filters;
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "backlinks",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [target],
    limit: body.limit as number,
    filters: opts.filters,
  });
}

// Domain-level backlink profile summary: total backlinks, referring
// domains, dofollow/nofollow split, rank - the "how big and how clean is
// our link profile overall" snapshot, one cheap call.
export function backlinksSummary(target: string, opts: BacklinksOptions): Promise<DataForSeoResult> {
  const endpoint = "backlinks/summary/live";
  const body = { target, backlinks_status_type: "live" };
  return dataForSeoRequest({
    workflow: opts.workflow,
    apiFamily: API_FAMILY,
    cacheFamily: "backlinks",
    endpoint,
    body,
    environment: opts.environment,
    confirmLive: opts.confirmLive,
    seedTerms: [target],
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
