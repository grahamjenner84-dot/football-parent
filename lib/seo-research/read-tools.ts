import { seoAdminClient } from "./supabase";
import { budgetUsd, connectorSpend } from "./dataforseo";

// The connector's free tools: reads of the copy of the PC's SEO database
// that `npm run seo:sync` pushes to Supabase. Nothing here calls DataForSEO
// or writes anything.

function normalise(raw: string): string {
  return raw.toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
}

// PostgREST's ilike takes * or % as wildcards; strip the characters that
// would change the filter's meaning.
function likeTerm(raw: string): string {
  return `%${normalise(raw).replace(/[%_*,()\\]/g, " ").trim()}%`;
}

function pathOf(raw: string): string {
  const trimmed = raw.trim();
  try {
    return new URL(trimmed).pathname.replace(/\/$/, "") || "/";
  } catch {
    return (trimmed.startsWith("/") ? trimmed : `/${trimmed}`).replace(/\/$/, "") || "/";
  }
}

async function syncedAt(key: string): Promise<string | null> {
  const { data } = await seoAdminClient().from("seo_sync_meta").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Could not read ${what}: ${res.error.message}`);
  return (res.data ?? ([] as unknown)) as T;
}

// ---------------------------------------------------------------- Tracker

const PAGE_FIELDS =
  "id, url, article, category, primary_keyword, secondary_keywords, cluster, status, total_target_sv, gsc_impressions, gsc_clicks, gsc_ctr, avg_position, opportunity_score, priority, notes, fact_checked_at, seo_optimised_at, last_reviewed_at, personal_story_count, expert_quote_count, inbound_internal_links, voice_pct, updated_at";

export async function getArticleTracker(opts: { status?: string; search?: string }) {
  const supabase = seoAdminClient();
  let query = supabase.from("seo_pages").select(PAGE_FIELDS).order("url").limit(300);
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.search?.trim()) {
    const t = likeTerm(opts.search);
    query = query.or(`url.ilike.${t},article.ilike.${t},primary_keyword.ilike.${t},cluster.ilike.${t}`);
  }
  const rows = check(await query, "the article tracker") as Array<Record<string, unknown>>;
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const s = (r.status as string | null) ?? "no status (existing page)";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return {
    syncedFromPcAt: await syncedAt("sqlite"),
    note:
      "The article tracker (pages table in the PC's SEO database). status 'planned' is the article roadmap; no status means an existing page imported from the tracker. GSC columns are whatever the last tracker import held, so use inspect_page for current Search Console numbers.",
    countsByStatus: counts,
    pages: rows,
  };
}

// ---------------------------------------------------------------- Keywords

type KeywordRow = {
  id: number;
  keyword: string;
  normalised_keyword: string;
  volume: number | null;
  kd: number | null;
  source: string | null;
  target_url: string | null;
  mapped_article: string | null;
  keyword_type: string | null;
  cluster: string | null;
  notes: string | null;
};

async function enrichKeywords(rows: KeywordRow[]) {
  const supabase = seoAdminClient();
  const ids = rows.map((r) => r.id);
  if (!ids.length) return [];
  const [metrics, history, links] = await Promise.all([
    supabase.from("seo_keyword_metrics").select("keyword_id, retrieved_at, search_volume, cpc, keyword_difficulty, search_intent").in("keyword_id", ids).order("retrieved_at", { ascending: false }),
    supabase.from("seo_monthly_search_history").select("keyword_id, year, month, search_volume").in("keyword_id", ids),
    supabase.from("seo_page_keywords").select("keyword_id, page_id, relationship").in("keyword_id", ids),
  ]);
  const metricRows = check(metrics, "keyword metrics") as Array<Record<string, unknown> & { keyword_id: number }>;
  const historyRows = check(history, "search history") as Array<{ keyword_id: number; year: number; month: number; search_volume: number | null }>;
  const linkRows = check(links, "page links") as Array<{ keyword_id: number; page_id: number; relationship: string }>;

  const pageIds = [...new Set(linkRows.map((l) => l.page_id))];
  const pages = pageIds.length
    ? (check(await supabase.from("seo_pages").select("id, url, status").in("id", pageIds), "pages") as Array<{ id: number; url: string; status: string | null }>)
    : [];

  return rows.map((k) => {
    const latest = metricRows.find((m) => m.keyword_id === k.id);
    const months = historyRows
      .filter((h) => h.keyword_id === k.id)
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .slice(-12)
      .map((h) => ({ month: `${h.year}-${String(h.month).padStart(2, "0")}`, volume: h.search_volume }));
    return {
      keyword: k.keyword,
      volume: (latest?.search_volume as number | null | undefined) ?? k.volume,
      difficulty: (latest?.keyword_difficulty as number | null | undefined) ?? k.kd,
      intent: latest?.search_intent ?? null,
      cpcGbp: latest?.cpc ?? null,
      measuredAt: latest?.retrieved_at ?? null,
      cluster: k.cluster,
      type: k.keyword_type,
      targetUrl: k.target_url,
      mappedArticle: k.mapped_article,
      notes: k.notes,
      monthlyHistory: months,
      targetedBy: linkRows
        .filter((l) => l.keyword_id === k.id)
        .map((l) => {
          const p = pages.find((pg) => pg.id === l.page_id);
          return { url: p?.url ?? null, status: p?.status ?? null, relationship: l.relationship };
        }),
    };
  });
}

const KEYWORD_FIELDS = "id, keyword, normalised_keyword, volume, kd, source, target_url, mapped_article, keyword_type, cluster, notes";

export async function getKeywordData(opts: { keyword?: string; page?: string; limit?: number }) {
  const supabase = seoAdminClient();
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);

  if (opts.page?.trim()) {
    const path = pathOf(opts.page);
    const pages = check(
      await supabase.from("seo_pages").select(PAGE_FIELDS).ilike("url", `%${path.replace(/[%_*,()\\]/g, "")}`).limit(5),
      "pages"
    ) as Array<Record<string, unknown> & { id: number }>;
    const page = pages[0];
    if (!page) return { page: path, found: false, note: "Not in the article tracker. inspect_page gives its Search Console queries." };
    const links = check(await supabase.from("seo_page_keywords").select("keyword_id").eq("page_id", page.id), "page links") as Array<{ keyword_id: number }>;
    const byTarget = check(await supabase.from("seo_keywords").select(KEYWORD_FIELDS).ilike("target_url", `%${path}`).limit(200), "keywords") as KeywordRow[];
    const linked = links.length
      ? (check(await supabase.from("seo_keywords").select(KEYWORD_FIELDS).in("id", links.map((l) => l.keyword_id)), "keywords") as KeywordRow[])
      : [];
    const all = [...new Map([...linked, ...byTarget].map((k) => [k.id, k])).values()];
    const enriched = await enrichKeywords(all);
    return {
      syncedFromPcAt: await syncedAt("sqlite"),
      page,
      keywords: enriched.sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1)).slice(0, limit),
      totalKeywords: enriched.length,
    };
  }

  if (!opts.keyword?.trim()) throw new Error("Give a keyword or a page.");
  const exact = normalise(opts.keyword);
  const rows = check(
    await supabase.from("seo_keywords").select(KEYWORD_FIELDS).ilike("normalised_keyword", likeTerm(opts.keyword)).limit(200),
    "keywords"
  ) as KeywordRow[];
  // Exact match first, then shorter phrases (closest to the search) first.
  rows.sort((a, b) => Number(b.normalised_keyword === exact) - Number(a.normalised_keyword === exact) || a.normalised_keyword.length - b.normalised_keyword.length);
  const enriched = await enrichKeywords(rows.slice(0, limit));
  return {
    syncedFromPcAt: await syncedAt("sqlite"),
    search: opts.keyword,
    note:
      "Keywords the PC's SEO database already holds that contain this phrase. An empty list means it has never been researched, not that nobody searches it: use get_keyword_metrics (Google Ads, free) for volume or find_related_keywords (paid) to research it.",
    totalMatches: rows.length,
    keywords: enriched,
  };
}

// ---------------------------------------------------------------- Past research

export async function getPastResearch(opts: { search?: string; page?: string; limit?: number }) {
  const supabase = seoAdminClient();
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 40);
  let runsQuery = supabase.from("seo_discovery_runs").select("id, run_type, page_id, endpoint, seed_terms, created_at").order("created_at", { ascending: false }).limit(limit);
  if (opts.search?.trim()) runsQuery = runsQuery.ilike("seed_terms", likeTerm(opts.search));
  if (opts.page?.trim()) {
    const path = pathOf(opts.page);
    const pages = check(await supabase.from("seo_pages").select("id").ilike("url", `%${path}`).limit(5), "pages") as Array<{ id: number }>;
    if (!pages.length) return { page: path, runs: [], note: "That page isn't in the article tracker, so no research runs are tied to it." };
    runsQuery = runsQuery.in("page_id", pages.map((p) => p.id));
  }
  const runs = check(await runsQuery, "research runs") as Array<{ id: number; run_type: string; page_id: number | null; endpoint: string; seed_terms: string; created_at: string }>;
  if (!runs.length) {
    return {
      syncedFromPcAt: await syncedAt("sqlite"),
      runs: [],
      note: "No keyword-discovery runs match. Other research (SERP checks, competitor pulls) lives in seo-data/exports on the PC and isn't in this copy.",
    };
  }

  const results = check(
    await supabase.from("seo_discovery_results").select("discovery_run_id, keyword_id, relevance_flag, classification, rationale").in("discovery_run_id", runs.map((r) => r.id)),
    "research results"
  ) as Array<{ discovery_run_id: number; keyword_id: number; relevance_flag: string | null; classification: string | null; rationale: string | null }>;
  const kwIds = [...new Set(results.map((r) => r.keyword_id))];
  const keywords: Array<{ id: number; keyword: string; volume: number | null; kd: number | null }> = [];
  for (let i = 0; i < kwIds.length; i += 200) {
    keywords.push(...(check(await supabase.from("seo_keywords").select("id, keyword, volume, kd").in("id", kwIds.slice(i, i + 200)), "keywords") as typeof keywords));
  }
  const pageIds = [...new Set(runs.map((r) => r.page_id).filter((p): p is number => p != null))];
  const pages = pageIds.length ? (check(await supabase.from("seo_pages").select("id, url").in("id", pageIds), "pages") as Array<{ id: number; url: string }>) : [];

  return {
    syncedFromPcAt: await syncedAt("sqlite"),
    note: "Keyword-discovery runs from the seo-page / seo-content skills. relevance 'review' means found but not yet judged; 'irrelevant' were ruled out.",
    runs: runs.map((run) => {
      const own = results.filter((r) => r.discovery_run_id === run.id);
      return {
        date: run.created_at.slice(0, 10),
        type: run.run_type,
        page: pages.find((p) => p.id === run.page_id)?.url ?? null,
        source: run.endpoint.replace("dataforseo_labs/google/", "").replace("/live", ""),
        seeds: (() => {
          try {
            return JSON.parse(run.seed_terms);
          } catch {
            return run.seed_terms;
          }
        })(),
        keywordsFound: own.length,
        ruledOut: own.filter((r) => r.relevance_flag === "irrelevant").length,
        keywords: own
          .filter((r) => r.relevance_flag !== "irrelevant")
          .map((r) => {
            const k = keywords.find((kw) => kw.id === r.keyword_id);
            return { keyword: k?.keyword ?? null, volume: k?.volume ?? null, difficulty: k?.kd ?? null, classification: r.classification };
          })
          .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1))
          .slice(0, 40),
      };
    }),
  };
}

// ---------------------------------------------------------------- AI citations

type CitationRow = {
  checked_on: string;
  platform: string;
  prompt: string;
  cited: boolean | null;
  citation_position: number | null;
  competitor_domains: string | null;
  notes: string | null;
  source: string;
};

export async function getAiCitations(opts: { search?: string; platform?: string; sinceDays?: number; citedOnly?: boolean }) {
  const supabase = seoAdminClient();
  const sinceDays = Math.min(Math.max(opts.sinceDays ?? 120, 1), 730);
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString().slice(0, 10);

  const rows: CitationRow[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase
      .from("seo_ai_citations")
      .select("checked_on, platform, prompt, cited, citation_position, competitor_domains, notes, source")
      .gte("checked_on", since)
      .order("checked_on", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (opts.search?.trim()) q = q.ilike("prompt", likeTerm(opts.search));
    if (opts.platform?.trim()) q = q.ilike("platform", `%${opts.platform.trim().replace(/[%_*,()\\]/g, "")}%`);
    const page = check(await q, "AI citations") as CitationRow[];
    rows.push(...page);
    if (page.length < 1000) break;
  }

  // Latest result per prompt and platform, and what it was before.
  const byKey = new Map<string, CitationRow[]>();
  for (const r of rows) {
    const key = `${r.platform}|${r.prompt.toLowerCase()}`;
    byKey.set(key, [...(byKey.get(key) ?? []), r]);
  }
  const latest = [...byKey.values()].map((history) => {
    const now = history[history.length - 1];
    const before = history.length > 1 ? history[history.length - 2] : null;
    return {
      prompt: now.prompt,
      platform: now.platform,
      lastChecked: now.checked_on,
      citesUs: now.cited,
      ourSourcePosition: now.citation_position,
      otherSources: now.competitor_domains || null,
      previous: before ? { checked: before.checked_on, citesUs: before.cited, ourSourcePosition: before.citation_position } : null,
      changed: before != null && before.cited !== now.cited,
      checks: history.length,
      notes: now.notes,
    };
  });

  const competitorCounts = new Map<string, number>();
  for (const l of latest) {
    for (const d of (l.otherSources ?? "").split(/;\s*/).filter(Boolean)) competitorCounts.set(d, (competitorCounts.get(d) ?? 0) + 1);
  }

  let watchlist: Array<{ checked_on: string; keyword: string; data: unknown }> = [];
  if (opts.search?.trim()) {
    watchlist = check(
      await supabase.from("seo_geo_watchlist_history").select("checked_on, keyword, data").ilike("keyword", likeTerm(opts.search)).order("checked_on").limit(50),
      "GEO watchlist history"
    ) as typeof watchlist;
  }

  const filtered = opts.citedOnly ? latest.filter((l) => l.citesUs) : latest;
  return {
    syncedFromPcAt: await syncedAt("citations"),
    window: `checks since ${since}`,
    note:
      "From ai-citation-log.csv (PC checks) plus checks made through this connector (check_serp). Rows before 10 Nov 2026 were checked without the async AI Overview load, so an older 'no AI Overview' or 'not cited' can be a missed overview rather than a real absence. ChatGPT and Perplexity rows were checked by hand.",
    summary: {
      promptsTracked: latest.length,
      citingUsNow: latest.filter((l) => l.citesUs).length,
      changedSinceLastCheck: latest.filter((l) => l.changed).map((l) => ({ prompt: l.prompt, platform: l.platform, nowCitesUs: l.citesUs, lastChecked: l.lastChecked })),
      mostCitedOtherSources: [...competitorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([site, prompts]) => ({ site, prompts })),
    },
    prompts: filtered.sort((a, b) => b.lastChecked.localeCompare(a.lastChecked)).slice(0, 150),
    geoWatchlistHistory: watchlist,
  };
}

// ---------------------------------------------------------------- Spend

export async function getDataforseoSpend() {
  const supabase = seoAdminClient();
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [connector, pc] = await Promise.all([
    supabase.from("seo_mcp_usage").select("occurred_at, tool, cost, status").gte("occurred_at", since30).order("occurred_at", { ascending: false }),
    supabase.from("seo_api_usage_local").select("occurred_at, workflow, cost").gte("occurred_at", since30),
  ]);
  const connectorRows = check(connector, "the connector spend ledger") as Array<{ occurred_at: string; tool: string; cost: number; status: string }>;
  const pcRows = check(pc, "PC spend") as Array<{ occurred_at: string; workflow: string; cost: number | null }>;

  const sum = (xs: Array<{ cost: number | null }>) => Number(xs.reduce((s, x) => s + Number(x.cost ?? 0), 0).toFixed(4));
  const group = <T extends { cost: number | null }>(xs: T[], key: (x: T) => string) => {
    const m = new Map<string, T[]>();
    for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]);
    return [...m.entries()].map(([k, v]) => ({ name: k, calls: v.length, usd: sum(v) })).sort((a, b) => b.usd - a.usd);
  };
  const dayAgo = Date.now() - 86_400_000;

  return {
    connector: {
      dailyCapUsd: budgetUsd(),
      spentLast24hUsd: Number((await connectorSpend(86_400_000)).toFixed(4)),
      last24hByTool: group(connectorRows.filter((r) => new Date(r.occurred_at).getTime() >= dayAgo && r.status !== "cache_hit"), (r) => r.tool),
      last30dUsd: sum(connectorRows),
      last30dByTool: group(connectorRows.filter((r) => r.status !== "cache_hit"), (r) => r.tool),
      cacheHitsLast30d: connectorRows.filter((r) => r.status === "cache_hit").length,
      refusedByCapLast30d: connectorRows.filter((r) => r.status === "refused").length,
    },
    pc: {
      syncedFromPcAt: await syncedAt("sqlite"),
      last30dUsd: sum(pcRows),
      last30dByWorkflow: group(pcRows, (r) => r.workflow).slice(0, 15),
      note: "Live calls made from the PC scripts, as of the last sync. Not counted toward the connector's daily cap.",
    },
  };
}
