import {
  extractSerpFeatures,
  citationSummary,
  isOurResult,
  siteLabel,
  type SerpItem,
} from "@/scripts/seo/dataforseo/serp-features";
import { paidCall, UK_LOCATION_CODE, ENGLISH, type PaidResult } from "./dataforseo";
import { seoAdminClient } from "./supabase";
import { ukToday } from "@/lib/uk-day";

// The connector's paid tools. Each shapes DataForSEO's answer down to what
// is worth reading in a chat; the raw result stays in seo_mcp_cache.

function spendNote(r: PaidResult) {
  return {
    costUsd: Number(r.costUsd.toFixed(4)),
    fromCache: r.fromCache,
    fetchedAt: r.fetchedAt,
    connectorSpendLast24hUsd: Number(r.spentLast24hUsd.toFixed(4)),
    dailyCapUsd: r.budgetUsd,
  };
}

// ---------------------------------------------------------------- SERP

// DataForSEO now often gives results as google.com/goto redirects; those are
// long and useless on a phone, so only real addresses are shown.
function readableUrl(url: string | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\/(www\.)?google\.com\/goto/.test(url) ? null : url;
}

type OrganicItem = SerpItem & {
  rank_group?: number;
  rank_absolute?: number;
  url?: string;
  domain?: string;
  breadcrumb?: string;
  website_name?: string;
  description?: string;
};

export async function checkSerp(opts: { keyword: string; depth?: number; refresh?: boolean }) {
  const keyword = opts.keyword.trim();
  const depth = Math.min(Math.max(opts.depth ?? 20, 10), 20);
  const call = await paidCall({
    tool: "check_serp",
    endpoint: "serp/google/organic/live/advanced",
    body: {
      keyword,
      location_code: UK_LOCATION_CODE,
      language_code: ENGLISH,
      device: "desktop",
      depth,
      // Google loads many AI Overviews after the page; without this they
      // come back empty and read as "no AI Overview" (see
      // scripts/seo/cli/ai-overview-check.ts, on from 10 Nov 2026).
      load_async_ai_overview: true,
    },
    // A week: SERPs move, but not so fast that a re-ask the same week needs
    // a new paid call. refresh: true forces one.
    maxAgeHours: 24 * 7,
    refresh: opts.refresh,
  });

  const result = (call.result ?? {}) as { items?: OrganicItem[]; se_results_count?: number; item_types?: string[] };
  const items = result.items ?? [];
  const { aiOverview, paaQuestions, paaExpandedOverviews, relatedSearches } = extractSerpFeatures(items);
  const organic = items.filter((it) => it.type === "organic");
  const ours = organic.filter((it) => isOurResult(it));

  const aio = aiOverview ? citationSummary(aiOverview.references) : null;
  const paa = paaExpandedOverviews.map(({ question, item }) => {
    const c = citationSummary(item.references);
    return { question, // No references at all means the answer was not loaded, not that it skips us.
    aiAnswerCitesUs: item.references?.length ? c.cited : null, ourSourcePosition: c.position, otherSources: c.competitorDomains.slice(0, 5) };
  });

  // Same rows the PC scripts append to ai-citation-log.csv, so the history
  // keeps building from the phone. Only for a fresh check, never a cache hit.
  if (!call.fromCache) {
    const today = ukToday();
    const note = "via SEO connector, async AIO";
    const rows = [
      {
        checked_on: today,
        platform: "Google AI Overview (DataForSEO)",
        prompt: keyword,
        cited: aio?.cited ?? false,
        citation_position: aio?.position ?? null,
        competitor_domains: aio ? aio.competitorDomains.slice(0, 5).join("; ") : "",
        notes: aio ? note : `no AI Overview element on this SERP, ${note}`,
        source: "mcp",
      },
      ...paa.map((p) => ({
        checked_on: today,
        platform: "Google PAA AI Overview (DataForSEO)",
        prompt: p.question,
        cited: p.aiAnswerCitesUs,
        citation_position: p.ourSourcePosition,
        competitor_domains: p.otherSources.join("; "),
        notes: note,
        source: "mcp",
      })),
    ];
    const { error } = await seoAdminClient().from("seo_ai_citations").insert(rows);
    if (error) console.error("seo_ai_citations insert failed:", error.message);
  }

  return {
    keyword,
    location: "United Kingdom, English, desktop",
    ourPosition: ours[0]?.rank_group ?? null,
    ourUrls: ours.map((o) => ({ position: o.rank_group, url: readableUrl(o.url) })),
    aiOverview: aiOverview
      ? {
          present: true,
          citesUs: aio!.cited,
          ourSourcePosition: aio!.position,
          otherSources: aio!.competitorDomains,
          text: ((aiOverview as SerpItem & { markdown?: string }).markdown ?? aiOverview.text ?? "").slice(0, 1200) || null,
        }
      : { present: false },
    peopleAlsoAsk: paaQuestions.map((q) => {
      const answer = paa.find((p) => p.question === q);
      return answer ? { question: q, aiAnswerCitesUs: answer.aiAnswerCitesUs, otherSources: answer.otherSources } : { question: q };
    }),
    relatedSearches,
    otherFeatures: (result.item_types ?? []).filter((t) => !["organic", "ai_overview", "people_also_ask", "related_searches"].includes(t)),
    top: organic.slice(0, depth).map((o) => ({
      position: o.rank_group,
      site: siteLabel(o),
      title: o.title,
      url: readableUrl(o.url),
      isUs: isOurResult(o),
    })),
    note:
      "Live Google UK result from DataForSEO. AI Overview and People Also Ask rows are also logged to the AI citation history (get_ai_citations). Positions here are one live check; Search Console (inspect_page) is the authority for average rank.",
    spend: spendNote(call),
  };
}

// ---------------------------------------------------------------- Trends

type TrendsGraph = {
  type: "google_trends_graph";
  keywords?: string[];
  data?: Array<{ date_from?: string; values?: Array<number | null>; missing_data?: boolean }>;
  averages?: number[];
};
type TrendsQueries = {
  type: "google_trends_queries_list";
  keywords?: string[];
  data?: { top?: Array<{ query?: string; value?: number }>; rising?: Array<{ query?: string; value?: number }> };
};

type TimeRange = "past_12_months" | "past_5_years";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getTrends(opts: {
  keywords: string[];
  timeRange?: TimeRange;
  refresh?: boolean;
}) {
  const keywords = opts.keywords.map((k) => k.trim()).filter(Boolean).slice(0, 5);
  const timeRange = opts.timeRange ?? "past_5_years";
  const call = await paidCall({
    tool: "get_trends",
    endpoint: "keywords_data/google_trends/explore/live",
    body: {
      keywords,
      location_code: UK_LOCATION_CODE,
      language_code: ENGLISH,
      type: "web",
      time_range: timeRange,
      item_types: ["google_trends_graph", "google_trends_queries_list"],
    },
    maxAgeHours: 24 * 7,
    refresh: opts.refresh,
  });

  const items = ((call.result ?? {}) as { items?: Array<TrendsGraph | TrendsQueries> }).items ?? [];
  const graph = items.find((i): i is TrendsGraph => i.type === "google_trends_graph");
  const lists = items.filter((i): i is TrendsQueries => i.type === "google_trends_queries_list");

  // Weekly points become monthly averages per keyword (5 years of weeks is
  // too much to read on a phone), plus each keyword's average by calendar
  // month across all years, which is the seasonality answer.
  const byMonth = new Map<string, number[][]>();
  for (const point of graph?.data ?? []) {
    if (!point.date_from || !point.values) continue;
    const key = point.date_from.slice(0, 7);
    const bucket = byMonth.get(key) ?? keywords.map(() => []);
    point.values.forEach((v, i) => {
      if (typeof v === "number" && bucket[i]) bucket[i].push(v);
    });
    byMonth.set(key, bucket);
  }
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const monthly = [...byMonth.entries()].map(([month, buckets]) => ({
    month,
    ...Object.fromEntries(keywords.map((k, i) => [k, avg(buckets[i] ?? [])])),
  }));

  const seasonality = keywords.map((k, i) => {
    const perCalendarMonth = MONTHS.map((_, m) =>
      avg(
        [...byMonth.entries()]
          .filter(([month]) => Number(month.slice(5, 7)) === m + 1)
          .flatMap(([, buckets]) => buckets[i] ?? [])
      )
    );
    const ranked = perCalendarMonth
      .map((v, m) => ({ month: MONTHS[m], value: v ?? 0 }))
      .sort((a, b) => b.value - a.value);
    return {
      keyword: k,
      averageInterest: graph?.averages?.[i] ?? null,
      byCalendarMonth: Object.fromEntries(MONTHS.map((m, j) => [m, perCalendarMonth[j]])),
      peakMonths: ranked.slice(0, 3).map((r) => r.month),
      quietestMonths: ranked.slice(-3).map((r) => r.month),
    };
  });

  return {
    keywords,
    location: "United Kingdom, web search",
    timeRange,
    note: "Google Trends interest is relative (0-100, 100 = the highest point for any of these terms in the range), not search volume. For volumes use get_keyword_metrics.",
    seasonality,
    monthly,
    relatedQueries: lists.map((l) => ({
      keyword: l.keywords?.join(", ") ?? null,
      top: (l.data?.top ?? []).slice(0, 10).map((q) => ({ query: q.query, value: q.value })),
      rising: (l.data?.rising ?? []).slice(0, 10).map((q) => ({ query: q.query, value: q.value })),
    })),
    spend: spendNote(call),
  };
}

// ---------------------------------------------------------------- Keywords

type KeywordData = {
  keyword?: string;
  keyword_info?: { search_volume?: number | null; cpc?: number | null; competition_level?: string | null };
  keyword_properties?: { keyword_difficulty?: number | null };
  search_intent_info?: { main_intent?: string | null };
};

function shapeKeyword(k: KeywordData | undefined) {
  return {
    keyword: k?.keyword ?? null,
    monthlyVolume: k?.keyword_info?.search_volume ?? null,
    difficulty: k?.keyword_properties?.keyword_difficulty ?? null,
    intent: k?.search_intent_info?.main_intent ?? null,
    cpcGbp: k?.keyword_info?.cpc ?? null,
  };
}

export async function findRelatedKeywords(opts: {
  seed: string;
  mode?: "suggestions" | "related";
  limit?: number;
  refresh?: boolean;
}) {
  const seed = opts.seed.trim();
  const mode = opts.mode ?? "suggestions";
  const limit = Math.min(Math.max(opts.limit ?? 50, 10), 100);
  const endpoint =
    mode === "related" ? "dataforseo_labs/google/related_keywords/live" : "dataforseo_labs/google/keyword_suggestions/live";
  const call = await paidCall({
    tool: "find_related_keywords",
    endpoint,
    body: {
      keyword: seed,
      location_code: UK_LOCATION_CODE,
      language_code: ENGLISH,
      limit,
      ...(mode === "suggestions" ? { include_seed_keyword: true } : { depth: 2 }),
    },
    maxAgeHours: 24 * 30,
    refresh: opts.refresh,
  });

  const result = (call.result ?? {}) as { items?: Array<KeywordData & { keyword_data?: KeywordData }>; total_count?: number };
  const keywords = (result.items ?? [])
    .map((it) => shapeKeyword(mode === "related" ? it.keyword_data : it))
    .sort((a, b) => (b.monthlyVolume ?? -1) - (a.monthlyVolume ?? -1));

  return {
    seed,
    mode,
    location: "United Kingdom, English",
    note:
      mode === "suggestions"
        ? "Suggestions are longer phrases containing the seed (long-tail variants). Volumes are DataForSEO's Google Ads-based monthly averages; null means not measured, not zero. get_keyword_data shows what we already target."
        : "Related keywords come from Google's 'related searches' around the seed, so they can be different wording for the same need. Volumes: null means not measured, not zero.",
    totalAvailable: result.total_count ?? null,
    keywords,
    spend: spendNote(call),
  };
}

export async function getCompetitorKeywords(opts: {
  domain: string;
  contains?: string;
  limit?: number;
  refresh?: boolean;
}) {
  const domain = opts.domain.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const limit = Math.min(Math.max(opts.limit ?? 50, 10), 100);
  const body: Record<string, unknown> = {
    target: domain,
    location_code: UK_LOCATION_CODE,
    language_code: ENGLISH,
    limit,
    order_by: ["keyword_data.keyword_info.search_volume,desc"],
  };
  if (opts.contains?.trim()) body.filters = ["keyword_data.keyword", "like", `%${opts.contains.trim()}%`];

  const call = await paidCall({
    tool: "get_competitor_keywords",
    endpoint: "dataforseo_labs/google/ranked_keywords/live",
    body,
    maxAgeHours: 24 * 14,
    refresh: opts.refresh,
  });

  type Ranked = {
    keyword_data?: KeywordData;
    ranked_serp_element?: { serp_item?: { rank_group?: number; url?: string; etv?: number; type?: string } };
  };
  const result = (call.result ?? {}) as { items?: Ranked[]; total_count?: number };
  return {
    domain,
    filter: opts.contains?.trim() || null,
    location: "United Kingdom, English",
    note:
      "What DataForSEO has measured this domain ranking for, biggest searches first. It misses a lot of the unmeasured long tail, so check live SERPs (check_serp) on audience-phrased searches before concluding a competitor doesn't rank for something.",
    totalRankedKeywords: result.total_count ?? null,
    keywords: (result.items ?? []).map((it) => ({
      ...shapeKeyword(it.keyword_data),
      position: it.ranked_serp_element?.serp_item?.rank_group ?? null,
      url: it.ranked_serp_element?.serp_item?.url ?? null,
      estimatedMonthlyClicks: it.ranked_serp_element?.serp_item?.etv != null ? Math.round(it.ranked_serp_element.serp_item.etv) : null,
    })),
    spend: spendNote(call),
  };
}

export async function getDomainStrength(opts: { domain: string; refresh?: boolean }) {
  const domain = opts.domain.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const call = await paidCall({
    tool: "get_domain_strength",
    endpoint: "backlinks/summary/live",
    body: { target: domain, backlinks_status_type: "live", include_subdomains: true },
    maxAgeHours: 24 * 30,
    refresh: opts.refresh,
  });
  const r = (call.result ?? {}) as Record<string, unknown>;
  return {
    domain,
    rank: r.rank ?? null,
    backlinks: r.backlinks ?? null,
    referringDomains: r.referring_domains ?? null,
    referringMainDomains: r.referring_main_domains ?? null,
    referringDomainsNofollow: r.referring_domains_nofollow ?? null,
    brokenBacklinks: r.broken_backlinks ?? null,
    spamScore: r.backlinks_spam_score ?? null,
    firstSeen: r.first_seen ?? null,
    note: "DataForSEO's own index and rank (0-1000 scale), not Moz DA or Ahrefs DR, so compare domains with each other here rather than with numbers from other tools.",
    spend: spendNote(call),
  };
}
