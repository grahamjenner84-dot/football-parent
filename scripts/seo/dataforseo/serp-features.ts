// Shared parsing for the SERP feature items (ai_overview, people_also_ask,
// related_searches) that serp/google/organic/live/advanced already returns
// alongside organic results - see endpoints/serp.ts. Used by both
// ai-overview-check.ts (citation logging) and faq-gap-check.ts (FAQ
// candidate discovery), so the item-shape parsing lives in one place.

const TARGET_DOMAIN = "footballparent.co.uk";

export type SerpItem = {
  type: string;
  text?: string;
  references?: Array<{ url?: string; domain?: string; title?: string; source?: string }>;
  items?: Array<SerpItem | string>; // people_also_ask nests one sub-item per question; related_searches nests plain strings (observed) or objects
  title?: string; // people_also_ask sub-item question text
  keyword?: string; // related_searches sub-item text, when present as an object
  expanded_element?: SerpItem[]; // people_also_ask_ai_overview_expanded_element lives here
};

export function isOurDomain(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() === TARGET_DOMAIN;
  } catch {
    return false;
  }
}

// The fields DataForSEO gives a result or an AI Overview reference that can
// say which site it is.
export type SiteFields = {
  url?: string;
  domain?: string;
  breadcrumb?: string; // organic results, e.g. "https://www.footballdna.co.uk › sessions"
  website_name?: string; // organic results, e.g. "Football DNA" or "Facebook · Junior Grassroots Hub"
  source?: string; // AI Overview references, e.g. "Football DNA"
};

// Names Google shows for this site when it hides the address.
const OUR_SITE_NAMES = new Set(["football parent", "footballparent.co.uk", "footballparent"]);

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// Since about Nov 2026 DataForSEO returns many results and AI Overview
// references as a https://google.com/goto?url=... redirect, with domain
// "google.com" (64 of 148 AI Overview references and most organic results in
// the 10 Nov Football DNA pull). The real site is then only in the breadcrumb
// (organic) or the site name. Returns the bare hostname when it can be known,
// otherwise null.
export function siteOf(item: SiteFields): string | null {
  const fromUrl = hostOf(item.url);
  if (fromUrl && fromUrl !== "google.com") return fromUrl;
  const domain = item.domain?.replace(/^www\./, "").toLowerCase();
  if (domain && domain !== "google.com") return domain;
  const crumb = item.breadcrumb?.match(/^https?:\/\/[^\s›]+/)?.[0];
  return hostOf(crumb);
}

// A readable label for reports: the hostname, or the site name Google shows.
export function siteLabel(item: SiteFields): string {
  return siteOf(item) ?? item.source ?? item.website_name ?? "unknown";
}

export function isOurResult(item: SiteFields): boolean {
  const site = siteOf(item);
  if (site) return site === TARGET_DOMAIN;
  // Address hidden: match the site name exactly, so "Football Parents UK"
  // groups and similar don't count as us.
  const name = (item.source ?? item.website_name ?? "").trim().toLowerCase();
  return OUR_SITE_NAMES.has(name);
}

export function citationSummary(refs: SiteFields[] | undefined) {
  const list = refs ?? [];
  const ourIndex = list.findIndex((r) => isOurResult(r));
  const competitorDomains = [
    ...new Set(list.filter((r) => !isOurResult(r)).map((r) => siteLabel(r)).filter((d) => d !== "unknown")),
  ];
  return { cited: ourIndex !== -1, position: ourIndex === -1 ? null : ourIndex + 1, competitorDomains };
}

export type SerpFeatures = {
  aiOverview: SerpItem | undefined;
  paaQuestions: string[];
  paaExpandedOverviews: Array<{ question: string; item: SerpItem }>;
  relatedSearches: string[];
};

export function extractSerpFeatures(items: SerpItem[]): SerpFeatures {
  const aiOverview = items.find((it) => it.type === "ai_overview");

  const paa = items.find((it) => it.type === "people_also_ask");
  const paaSubItems = (paa?.items ?? []).filter((q): q is SerpItem => typeof q !== "string");
  const paaQuestions = paaSubItems.map((q) => q.title).filter((t): t is string => !!t);

  const paaExpandedOverviews: Array<{ question: string; item: SerpItem }> = [];
  for (const q of paaSubItems) {
    const expanded = (q.expanded_element ?? []).find((e) => e.type === "people_also_ask_ai_overview_expanded_element");
    if (expanded && q.title) paaExpandedOverviews.push({ question: q.title, item: expanded });
  }

  const relatedBlock = items.find((it) => it.type === "related_searches");
  const relatedSearches = (relatedBlock?.items ?? [])
    .map((r) => (typeof r === "string" ? r : (r.keyword ?? r.title)))
    .filter((t): t is string => !!t);

  return { aiOverview, paaQuestions, paaExpandedOverviews, relatedSearches };
}
