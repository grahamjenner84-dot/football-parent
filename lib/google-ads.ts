// Google Ads API over REST: Keyword Planner (KeywordPlanIdeaService) and
// read-only account reporting (GoogleAdsService.Search). No mutate calls.
//
// Auth is a user OAuth refresh token for footballparentuk@gmail.com (minted
// with scripts/get-google-ads-refresh-token.mjs), not a service account:
// Google Ads only takes service accounts through Workspace domain-wide
// delegation. No developer-token header: Google sunset developer tokens on
// 9 Sept 2026 and access level now comes from the Cloud project that owns the
// OAuth client (football-parent-keyword-agent, Basic access). The API ignores
// the header today and will reject it in a future major version.
//
// Numbers are passed through exactly as the API returns them, never estimated.
// int64 fields arrive as JSON strings; a field the API leaves out is null.

const API_VERSION = "v26";
const API_BASE = `https://googleads.googleapis.com/${API_VERSION}`;

export const DEFAULT_GEO = "geoTargetConstants/2826"; // United Kingdom
export const DEFAULT_LANGUAGE = "languageConstants/1000"; // English
const NETWORK = "GOOGLE_SEARCH";

type MonthlySearchVolume = { year?: string; month?: string; monthlySearches?: string };

type RawMetrics = {
  avgMonthlySearches?: string;
  monthlySearchVolumes?: MonthlySearchVolume[];
  competition?: string;
  competitionIndex?: string;
  lowTopOfPageBidMicros?: string;
  highTopOfPageBidMicros?: string;
};

export type KeywordRow = {
  keyword: string;
  closeVariants?: string[];
  avgMonthlySearches: string | null;
  monthlySearchVolumes: { year: string | null; month: string | null; monthlySearches: string | null }[] | null;
  competition: string | null;
  competitionIndex: string | null;
  lowTopOfPageBidMicros: string | null;
  highTopOfPageBidMicros: string | null;
};

export class GoogleAdsApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Google Ads API ${status}: ${body}`);
  }
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const digits = (id: string) => id.replace(/-/g, "");

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_ADS_CLIENT_ID"),
      client_secret: env("GOOGLE_ADS_CLIENT_SECRET"),
      refresh_token: env("GOOGLE_ADS_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new GoogleAdsApiError(res.status, text);
  return JSON.parse(text).access_token;
}

async function post(path: string, body: object): Promise<any> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "login-customer-id": digits(env("GOOGLE_ADS_LOGIN_CUSTOMER_ID")),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new GoogleAdsApiError(res.status, text);
  return text ? JSON.parse(text) : {};
}

async function callKeywordPlan(method: string, body: object, customerId?: string): Promise<{ customerId: string; json: any }> {
  const id = digits(customerId ?? env("GOOGLE_ADS_CUSTOMER_ID"));
  return { customerId: id, json: await post(`customers/${id}:${method}`, body) };
}

function toRow(keyword: string, m: RawMetrics | undefined, closeVariants?: string[]): KeywordRow {
  return {
    keyword,
    ...(closeVariants?.length ? { closeVariants } : {}),
    avgMonthlySearches: m?.avgMonthlySearches ?? null,
    monthlySearchVolumes:
      m?.monthlySearchVolumes?.map((v) => ({
        year: v.year ?? null,
        month: v.month ?? null,
        monthlySearches: v.monthlySearches ?? null,
      })) ?? null,
    competition: m?.competition ?? null,
    competitionIndex: m?.competitionIndex ?? null,
    lowTopOfPageBidMicros: m?.lowTopOfPageBidMicros ?? null,
    highTopOfPageBidMicros: m?.highTopOfPageBidMicros ?? null,
  };
}

// Says, in the response itself, where the API left values out, so a null is
// never read as a zero.
function dataNotes(rows: KeywordRow[]) {
  const count = (pick: (r: KeywordRow) => unknown) => rows.filter((r) => pick(r) == null).length;
  const nulls = {
    avgMonthlySearches: count((r) => r.avgMonthlySearches),
    monthlySearchVolumes: count((r) => r.monthlySearchVolumes),
    competition: count((r) => r.competition),
    competitionIndex: count((r) => r.competitionIndex),
    lowTopOfPageBidMicros: count((r) => r.lowTopOfPageBidMicros),
    highTopOfPageBidMicros: count((r) => r.highTopOfPageBidMicros),
  };
  const missing = Object.entries(nulls).filter(([, n]) => n > 0);
  return {
    nullCounts: nulls,
    note:
      "Values are exactly what the Google Ads API returned, unestimated. Searches are Google's own approximations (it rounds them); int64 fields come as strings; bids are in micros, not pounds (divide by 1,000,000: 450000 is 45p). " +
      (missing.length
        ? `The API returned no value for: ${missing.map(([k, n]) => `${k} on ${n} of ${rows.length} keywords`).join("; ")}. Those are null, not zero.`
        : "Every field had a value on every keyword."),
  };
}

const targeting = (geo?: string[], language?: string) => ({
  geoTargetConstants: geo?.length ? geo : [DEFAULT_GEO],
  language: language ?? DEFAULT_LANGUAGE,
  keywordPlanNetwork: NETWORK,
});

export async function getKeywordIdeas(opts: {
  keywords?: string[];
  url?: string;
  geoTargetConstants?: string[];
  language?: string;
  limit?: number;
  customerId?: string;
}) {
  const keywords = opts.keywords?.filter((k) => k.trim()) ?? [];
  if (!keywords.length && !opts.url) throw new Error("Give seed keywords, a seed URL, or both.");
  const seed = keywords.length && opts.url
    ? { keywordAndUrlSeed: { keywords, url: opts.url } }
    : keywords.length
      ? { keywordSeed: { keywords } }
      : { urlSeed: { url: opts.url } };
  const limit = opts.limit ?? 100;
  const request = { ...targeting(opts.geoTargetConstants, opts.language), pageSize: limit, ...seed };
  const { customerId, json } = await callKeywordPlan("generateKeywordIdeas", request, opts.customerId);
  const results: { text: string; keywordIdeaMetrics?: RawMetrics; closeVariants?: string[] }[] = json.results ?? [];
  const rows = results.slice(0, limit).map((r) => toRow(r.text, r.keywordIdeaMetrics, r.closeVariants));
  return {
    apiVersion: API_VERSION,
    customerId,
    request,
    totalSize: json.totalSize ?? null,
    returned: rows.length,
    ...dataNotes(rows),
    keywords: rows,
  };
}

export async function getKeywordMetrics(opts: {
  keywords: string[];
  geoTargetConstants?: string[];
  language?: string;
  customerId?: string;
}) {
  const keywords = opts.keywords.filter((k) => k.trim());
  if (!keywords.length) throw new Error("Give at least one keyword.");
  const request = { ...targeting(opts.geoTargetConstants, opts.language), keywords };
  const { customerId, json } = await callKeywordPlan("generateKeywordHistoricalMetrics", request, opts.customerId);
  const results: { text: string; keywordMetrics?: RawMetrics; closeVariants?: string[] }[] = json.results ?? [];
  const rows = results.map((r) => toRow(r.text, r.keywordMetrics, r.closeVariants));
  // The API merges near-exact duplicates ("car"/"cars" comes back as "car"),
  // so list what was asked for but has no row of its own.
  const returned = new Set(rows.flatMap((r) => [r.keyword, ...(r.closeVariants ?? [])].map((k) => k.toLowerCase())));
  const notReturned = keywords.filter((k) => !returned.has(k.toLowerCase()));
  return {
    apiVersion: API_VERSION,
    customerId,
    request,
    returned: rows.length,
    notReturned,
    ...dataNotes(rows),
    keywords: rows,
  };
}

// ---------------------------------------------------------------------------
// Read-only reporting through GoogleAdsService.Search (GAQL). Only SELECT
// queries go through here: nothing in this file calls a mutate method, and it
// must stay that way.

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type DateRange = { startDate?: string; endDate?: string };

// Defaults to the last 30 complete days in the account's own time zone.
function dateClause({ startDate, endDate }: DateRange): { where: string; label: string } {
  if (!startDate && !endDate) return { where: "segments.date DURING LAST_30_DAYS", label: "LAST_30_DAYS (account time zone)" };
  if (!startDate || !endDate || !DATE.test(startDate) || !DATE.test(endDate)) {
    throw new Error("Give both startDate and endDate as YYYY-MM-DD, or neither for the last 30 days.");
  }
  return { where: `segments.date BETWEEN '${startDate}' AND '${endDate}'`, label: `${startDate} to ${endDate}` };
}

async function search(customerId: string, query: string): Promise<any[]> {
  const rows: any[] = [];
  let pageToken: string | undefined;
  do {
    const json = await post(`customers/${customerId}/googleAds:search`, { query, ...(pageToken ? { pageToken } : {}) });
    rows.push(...(json.results ?? []));
    pageToken = json.nextPageToken;
  } while (pageToken);
  return rows;
}

const reportCustomer = (customerId?: string) => digits(customerId ?? env("GOOGLE_ADS_CUSTOMER_ID"));

// Micros to the account currency's units, unrounded. Null stays null.
const fromMicros = (micros: string | number | undefined) => (micros == null ? null : Number(micros) / 1_000_000);

async function accountCurrency(customerId: string): Promise<string | null> {
  const [row] = await search(customerId, "SELECT customer.currency_code FROM customer");
  return row?.customer?.currencyCode ?? null;
}

// A campaign or keyword with no traffic still comes back as a row of zeros,
// so "has data" means at least one impression or some spend.
function report<T extends { impressions: string | null; costGBP: number | null }>(
  customerId: string,
  range: string,
  currency: string | null,
  rows: T[],
  what: string
) {
  const hasData = rows.some((r) => Number(r.impressions ?? 0) > 0 || (r.costGBP ?? 0) > 0);
  const noDataMessage = rows.length
    ? `No ${what} had any impressions or spend for ${range} on account ${customerId}: the ${rows.length} rows below are all zeros.`
    : `No ${what} with data for ${range} on account ${customerId}.`;
  const currencyNote =
    currency === "GBP"
      ? "Money fields ending GBP are converted from the API's micros (divided by 1,000,000), unrounded. Everything else is exactly as the API returned it (int64 counts arrive as strings)."
      : `This account's currency is ${currency ?? "unknown"}, not GBP: the money fields are that currency, converted from micros (divided by 1,000,000). Everything else is exactly as the API returned it.`;
  return {
    apiVersion: API_VERSION,
    customerId,
    dateRange: range,
    currency,
    hasData,
    ...(hasData ? {} : { noDataMessage }),
    note: currencyNote,
    rows,
  };
}

export async function listAdsAccounts() {
  const managerId = digits(env("GOOGLE_ADS_LOGIN_CUSTOMER_ID"));
  const rows = await search(
    managerId,
    "SELECT customer_client.id, customer_client.descriptive_name, customer_client.status, customer_client.currency_code, customer_client.manager, customer_client.level FROM customer_client"
  );
  return {
    apiVersion: API_VERSION,
    managerId,
    accounts: rows.map((r) => ({
      id: r.customerClient?.id ?? null,
      name: r.customerClient?.descriptiveName ?? null,
      status: r.customerClient?.status ?? null,
      currency: r.customerClient?.currencyCode ?? null,
      manager: r.customerClient?.manager ?? false,
      level: r.customerClient?.level ?? null,
    })),
  };
}

export async function getCampaignPerformance(opts: DateRange & { customerId?: string }) {
  const customerId = reportCustomer(opts.customerId);
  const { where, label } = dateClause(opts);
  const [currency, rows] = await Promise.all([
    accountCurrency(customerId),
    search(
      customerId,
      `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros,
         metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.cost_micros,
         metrics.conversions, metrics.conversions_value
       FROM campaign WHERE ${where} ORDER BY metrics.cost_micros DESC`
    ),
  ]);
  return report(
    customerId,
    label,
    currency,
    rows.map((r) => ({
      campaignId: r.campaign?.id ?? null,
      campaign: r.campaign?.name ?? null,
      status: r.campaign?.status ?? null,
      channelType: r.campaign?.advertisingChannelType ?? null,
      dailyBudgetGBP: fromMicros(r.campaignBudget?.amountMicros),
      impressions: r.metrics?.impressions ?? null,
      clicks: r.metrics?.clicks ?? null,
      ctr: r.metrics?.ctr ?? null,
      avgCpcGBP: fromMicros(r.metrics?.averageCpc),
      costGBP: fromMicros(r.metrics?.costMicros),
      conversions: r.metrics?.conversions ?? null,
      conversionValue: r.metrics?.conversionsValue ?? null,
    })),
    "campaigns"
  );
}

export async function getSearchTerms(opts: DateRange & { customerId?: string; limit?: number }) {
  const customerId = reportCustomer(opts.customerId);
  const { where, label } = dateClause(opts);
  const [currency, rows] = await Promise.all([
    accountCurrency(customerId),
    search(
      customerId,
      `SELECT search_term_view.search_term, search_term_view.status, campaign.name, ad_group.name,
         metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
       FROM search_term_view WHERE ${where} ORDER BY metrics.impressions DESC LIMIT ${opts.limit ?? 500}`
    ),
  ]);
  return report(
    customerId,
    label,
    currency,
    rows.map((r) => ({
      searchTerm: r.searchTermView?.searchTerm ?? null,
      status: r.searchTermView?.status ?? null,
      campaign: r.campaign?.name ?? null,
      adGroup: r.adGroup?.name ?? null,
      impressions: r.metrics?.impressions ?? null,
      clicks: r.metrics?.clicks ?? null,
      costGBP: fromMicros(r.metrics?.costMicros),
      conversions: r.metrics?.conversions ?? null,
    })),
    "search terms"
  );
}

export async function getKeywordPerformance(opts: DateRange & { customerId?: string }) {
  const customerId = reportCustomer(opts.customerId);
  const { where, label } = dateClause(opts);
  const [currency, rows] = await Promise.all([
    accountCurrency(customerId),
    search(
      customerId,
      `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status,
         ad_group_criterion.quality_info.quality_score, campaign.name, ad_group.name,
         metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
       FROM keyword_view WHERE ${where} ORDER BY metrics.impressions DESC`
    ),
  ]);
  return report(
    customerId,
    label,
    currency,
    rows.map((r) => ({
      keyword: r.adGroupCriterion?.keyword?.text ?? null,
      matchType: r.adGroupCriterion?.keyword?.matchType ?? null,
      status: r.adGroupCriterion?.status ?? null,
      qualityScore: r.adGroupCriterion?.qualityInfo?.qualityScore ?? null,
      campaign: r.campaign?.name ?? null,
      adGroup: r.adGroup?.name ?? null,
      impressions: r.metrics?.impressions ?? null,
      clicks: r.metrics?.clicks ?? null,
      costGBP: fromMicros(r.metrics?.costMicros),
      conversions: r.metrics?.conversions ?? null,
    })),
    "keywords"
  );
}
