// Tiered backlink analysis for one broken destination URL. Tier 1 (summary)
// is cheap and runs for every candidate; tiers 2+ (referring domains, full
// backlink list, anchors) are expensive and gated by run.mjs's
// backlinksTier2Limit counter - see CONFIG.minReferringDomains /
// CONFIG.backlinksTier2Limit.
import { dataForSeoCall } from "./dataforseo-client.mjs";
import { CONFIG } from "../config.mjs";

export async function backlinksSummary(target) {
  return dataForSeoCall({
    family: "backlinks",
    endpoint: "backlinks/summary/live",
    body: { target, backlinks_status_type: "live" },
    workflow: "broken-link-finder",
  });
}

export async function referringDomains(target) {
  return dataForSeoCall({
    family: "backlinks",
    endpoint: "backlinks/referring_domains/live",
    body: { target, limit: CONFIG.referringDomainsLimit },
    workflow: "broken-link-finder",
  });
}

export async function backlinksList(target) {
  return dataForSeoCall({
    family: "backlinks",
    endpoint: "backlinks/backlinks/live",
    body: { target, mode: "as_is", limit: CONFIG.backlinksListLimit, backlinks_status_type: "live" },
    workflow: "broken-link-finder",
  });
}

export async function anchors(target) {
  return dataForSeoCall({
    family: "backlinks",
    endpoint: "backlinks/anchors/live",
    body: { target, limit: 50 },
    workflow: "broken-link-finder",
  });
}

// Summary-endpoint field names per docs.dataforseo.com/v3/backlinks-overview/.
export function parseSummary(summaryData) {
  const item = summaryData?.data?.tasks?.[0]?.result?.[0];
  if (!item) return null;
  return {
    backlinks: item.backlinks ?? 0,
    referringDomains: item.referring_domains ?? 0,
    referringDomainsDofollow: item.referring_domains_nofollow !== undefined
      ? (item.referring_domains ?? 0) - (item.referring_domains_nofollow ?? 0)
      : null,
    rank: item.rank ?? null,
  };
}
