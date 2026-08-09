// Shared parsing for the SERP feature items (ai_overview, people_also_ask,
// related_searches) that serp/google/organic/live/advanced already returns
// alongside organic results - see endpoints/serp.ts. Used by both
// ai-overview-check.ts (citation logging) and faq-gap-check.ts (FAQ
// candidate discovery), so the item-shape parsing lives in one place.

const TARGET_DOMAIN = "footballparent.co.uk";

export type SerpItem = {
  type: string;
  text?: string;
  references?: Array<{ url?: string; domain?: string; title?: string }>;
  items?: SerpItem[]; // people_also_ask nests one sub-item per question; related_searches nests plain strings/objects
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

export function citationSummary(refs: Array<{ url?: string; domain?: string }> | undefined) {
  const list = refs ?? [];
  const ourIndex = list.findIndex((r) => isOurDomain(r.url));
  const competitorDomains = [
    ...new Set(list.map((r) => r.domain?.replace(/^www\./, "")).filter((d): d is string => !!d && d !== TARGET_DOMAIN)),
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
  const paaQuestions = (paa?.items ?? []).map((q) => q.title).filter((t): t is string => !!t);

  const paaExpandedOverviews: Array<{ question: string; item: SerpItem }> = [];
  for (const q of paa?.items ?? []) {
    const expanded = (q.expanded_element ?? []).find((e) => e.type === "people_also_ask_ai_overview_expanded_element");
    if (expanded && q.title) paaExpandedOverviews.push({ question: q.title, item: expanded });
  }

  const relatedBlock = items.find((it) => it.type === "related_searches");
  const relatedSearches = (relatedBlock?.items ?? [])
    .map((r) => r.keyword ?? r.title)
    .filter((t): t is string => !!t);

  return { aiOverview, paaQuestions, paaExpandedOverviews, relatedSearches };
}
