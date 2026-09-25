"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type {
  SeoReport,
  StrikingRow,
  LowCtrRow,
  DecayRow,
  CannibalRow,
  SilenceRow,
  RankRow,
  RankTrackerSummary as RankTrackerSummaryData,
  RankSummaryBucket,
  NoImpressionsRow,
} from "@/lib/gsc";
import type { SearchLogStats } from "@/lib/supabase/search-log"; // type-only import, erased at build time - safe from a client component
import type { ConsentStats } from "@/lib/supabase/cookie-consent"; // type-only import, erased at build time - safe from a client component
import type { PeriodComparison, PeriodTotals, PageQueryMover } from "@/lib/gsc";
import { isPageViewOptedOut, setPageViewOptOut } from "@/lib/page-view-optout";
import type { PageViewStats, PageViewDay, PageViewDayComparison, PageViewDailyCount, BannerVariantStats, PageViewCountryStats, CountryViewRow } from "@/lib/supabase/page-views"; // type-only import, erased at build time - safe from a client component
import type { AffiliateClickStats } from "@/lib/supabase/affiliate-clicks"; // type-only, same reasoning as the page-views import above
import type { PartnerClickStats } from "@/lib/supabase/partner-clicks"; // type-only, same reasoning as the page-views import above
import type { CoachAppShareStats } from "@/lib/supabase/coach-app-shares"; // type-only, as above
import type { CoachAppFunnel } from "@/lib/supabase/coach-app-funnel"; // type-only, as above
import type { SourceGroupCount, PathSourceUserAgent } from "@/lib/supabase/page-views"; // type-only, as above
import { routes as siteRoutes } from "@/lib/routes"; // plain string array, no server-only deps - safe from a client component

type CoachAppViewStats = PageViewStats & {
  bannerVariants?: BannerVariantStats;
  shareStats?: CoachAppShareStats | { error: string };
};

type Tab =
  | "dashboard"
  | "silence"
  | "noImpressions"
  | "striking"
  | "ctr"
  | "decay"
  | "cannibal"
  | "rank"
  | "searches"
  | "cookies"
  | "compare"
  | "pageviews"
  | "pageviewsCompare"
  | "pageviewsTrend"
  | "countries"
  | "coachApp"
  | "coachFunnel"
  | "affiliate"
  | "partnerClicks";
type DayWindow = 7 | 28 | 90;

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "coachFunnel", label: "Coach App funnel" },
  { id: "pageviews", label: "Page views" },
  { id: "rank", label: "Rank tracker" },
  { id: "coachApp", label: "Coach App" },
  { id: "affiliate", label: "Affiliate clicks" },
  { id: "partnerClicks", label: "Football DNA clicks" },
  { id: "pageviewsCompare", label: "Compare page views" },
  { id: "pageviewsTrend", label: "Page trend" },
  { id: "countries", label: "Countries" },
  { id: "compare", label: "Compare days" },
  { id: "searches", label: "Top searches" },
  { id: "silence", label: "Gone quiet" },
  { id: "noImpressions", label: "No impressions" },
  { id: "striking", label: "Striking distance" },
  { id: "ctr", label: "Low CTR" },
  { id: "decay", label: "Decay" },
  { id: "cannibal", label: "Cannibalisation" },
  { id: "cookies", label: "Cookie consent" },
];

// The long "how this is measured" copy is genuinely useful the first time you
// read a tab and pure noise every time after, and there was enough of it to
// push the actual data below the fold. Native <details> keeps it one click
// away, collapsed by default, with no JS state to manage. Short status lines
// ("showing 20 of 87", a freshness warning) stay visible - only the standing
// explainers are folded away.
function SectionNote({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details style={styles.noteDetails}>
      <summary style={styles.noteSummary}>{label}</summary>
      <div style={{ ...styles.sectionNote, marginTop: 6 }}>{children}</div>
    </details>
  );
}

function shortPage(page: string): string {
  try {
    const u = new URL(page);
    return u.pathname === "/" ? "/" : u.pathname;
  } catch {
    return page;
  }
}

// Every page on the site, from the sitemap's manually maintained route list
// - so the page search boxes below can offer pages that have no page_views
// and no ranking data yet. Restricting the suggestion list to pages that
// already have data is what made the search look broken: a real page you
// could see impressions for simply never appeared.
const ALL_SITE_PATHS: string[] = siteRoutes.map((r) => (r === "" ? "/" : r));

// Merges the site's own route list with whatever paths the data actually
// contains (redirects, /coach-app, anything published but not yet added to
// lib/routes.ts), de-duplicated and sorted.
function allPagePaths(observed: string[] = []): string[] {
  return Array.from(new Set([...ALL_SITE_PATHS, ...observed])).sort((a, b) => a.localeCompare(b));
}

// Search matching is word-based, not raw substring: both sides are lowercased
// and every non-alphanumeric character (hyphens, slashes) becomes a space, then
// each typed word has to appear somewhere in the path. That is what makes
// "parent mistake" find /parent-guides/biggest-football-parent-mistakes -
// a plain `includes()` never matched because of the hyphens and the plural.
function normaliseForSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchesPageSearch(candidate: string, query: string): boolean {
  const terms = normaliseForSearch(query).split(" ").filter(Boolean);
  if (!terms.length) return false;
  const haystack = normaliseForSearch(candidate);
  return terms.every(
    (term) => haystack.includes(term) || (term.endsWith("s") && haystack.includes(term.slice(0, -1)))
  );
}

function searchPaths(paths: string[], query: string, limit: number): string[] {
  return paths.filter((p) => matchesPageSearch(p, query)).slice(0, limit);
}

export default function SeoAdminPage() {
  const [report, setReport] = useState<SeoReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [strikingDays, setStrikingDays] = useState<DayWindow>(90);
  const [ctrDays, setCtrDays] = useState<DayWindow>(90);
  const [noImpressionsDays, setNoImpressionsDays] = useState<DayWindow>(90);
  const [searchDays, setSearchDays] = useState<DayWindow>(28);
  // A specific day (YYYY-MM-DD) overrides the rolling window; "" means off.
  const [searchDate, setSearchDate] = useState("");
  // Stats are stored with the window they were fetched for, so switching
  // window shows "Loading" rather than the previous window's numbers under
  // the new label while the fetch is in flight.
  const searchWindowKey = searchDate ? `date=${searchDate}` : `days=${searchDays}`;
  const [searchFetched, setSearchFetched] = useState<{ key: string; data: SearchLogStats } | null>(null);
  const searchStats = searchFetched?.key === searchWindowKey ? searchFetched.data : null;
  const [searchError, setSearchError] = useState("");
  const [consentStats, setConsentStats] = useState<ConsentStats | null>(null);
  const [consentError, setConsentError] = useState("");
  const [pageViewStats, setPageViewStats] = useState<PageViewStats | null>(null);
  const [pageViewError, setPageViewError] = useState("");
  const [coachAppViewStats, setCoachAppViewStats] = useState<CoachAppViewStats | null>(null);
  const [coachAppViewError, setCoachAppViewError] = useState("");
  const [funnel, setFunnel] = useState<CoachAppFunnel | null>(null);
  const [funnelError, setFunnelError] = useState("");
  const [affiliateStats, setAffiliateStats] = useState<AffiliateClickStats | null>(null);
  const [affiliateError, setAffiliateError] = useState("");
  const [partnerStats, setPartnerStats] = useState<PartnerClickStats | null>(null);
  const [partnerError, setPartnerError] = useState("");
  const isFirstFetch = useRef(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/search-report?${searchWindowKey}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load search report");
        }
        return res.json();
      })
      .then((data: SearchLogStats) => {
        if (cancelled) return;
        setSearchFetched({ key: searchWindowKey, data });
        setSearchError("");
      })
      .catch((err) => {
        if (!cancelled) setSearchError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [searchWindowKey]);

  useEffect(() => {
    fetch("/api/cookie-consent-report?days=30")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load cookie consent report");
        }
        return res.json();
      })
      .then((data: ConsentStats) => {
        setConsentStats(data);
        setConsentError("");
      })
      .catch((err) => setConsentError(err.message));
  }, []);

  useEffect(() => {
    fetch("/api/page-view-report?days=30")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load page view report");
        }
        return res.json();
      })
      .then((data: PageViewStats) => {
        setPageViewStats(data);
        setPageViewError("");
      })
      .catch((err) => setPageViewError(err.message));
  }, []);

  useEffect(() => {
    fetch("/api/coach-app-view-report?days=30")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load Coach App view report");
        }
        return res.json();
      })
      .then((data: CoachAppViewStats) => {
        setCoachAppViewStats(data);
        setCoachAppViewError("");
      })
      .catch((err) => setCoachAppViewError(err.message));
  }, []);

  useEffect(() => {
    fetch("/api/coach-app-funnel-report?days=30")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load Coach App funnel");
        }
        return res.json();
      })
      .then((data: CoachAppFunnel) => {
        setFunnel(data);
        setFunnelError("");
      })
      .catch((err) => setFunnelError(err.message));
  }, []);

  useEffect(() => {
    fetch("/api/affiliate-click-report?days=30")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load affiliate click report");
        }
        return res.json();
      })
      .then((data: AffiliateClickStats) => {
        setAffiliateStats(data);
        setAffiliateError("");
      })
      .catch((err) => setAffiliateError(err.message));
  }, []);

  useEffect(() => {
    fetch("/api/partner-click-report?days=30")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load partner click report");
        }
        return res.json();
      })
      .then((data: PartnerClickStats) => {
        setPartnerStats(data);
        setPartnerError("");
      })
      .catch((err) => setPartnerError(err.message));
  }, []);

  useEffect(() => {
    if (isFirstFetch.current) {
      setLoading(true);
      isFirstFetch.current = false;
    } else {
      setRefreshing(true);
    }
    const qs = new URLSearchParams({
      strikingDays: String(strikingDays),
      ctrDays: String(ctrDays),
      noImpressionsDays: String(noImpressionsDays),
    });
    fetch(`/api/seo-report?${qs.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load report");
        }
        return res.json();
      })
      .then((data: SeoReport) => {
        setReport(data);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [strikingDays, ctrDays, noImpressionsDays]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>SEO optimisation report</h1>
          <a href="/admin/outreach" style={styles.navLink}>
            Link outreach
          </a>
        </div>
        {report && (
          <p style={styles.subtitle}>
            {report.periodStart} to {report.periodEnd}
            {refreshing && " - updating..."}
          </p>
        )}
        <PageViewOptOutToggle />
      </header>

      <nav style={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...styles.tabButton,
              ...(tab === t.id ? styles.tabButtonActive : {}),
            }}
          >
            {t.label}
            {t.id === "searches" && searchStats && (
              <span style={styles.tabCount}>{searchStats.totalSearches}</span>
            )}
            {t.id === "cookies" && consentStats && (
              <span style={styles.tabCount}>{consentStats.totalDecisions}</span>
            )}
            {t.id === "pageviews" && pageViewStats && (
              <span style={styles.tabCount}>{pageViewStats.totalViews}</span>
            )}
            {t.id === "coachApp" && coachAppViewStats && (
              <span style={styles.tabCount}>{coachAppViewStats.totalViews}</span>
            )}
            {t.id === "coachFunnel" && funnel && (
              <span style={styles.tabCount}>{funnel.totals.signups}</span>
            )}
            {t.id === "affiliate" && affiliateStats && (
              <span style={styles.tabCount}>{affiliateStats.totalClicks}</span>
            )}
            {t.id === "partnerClicks" && partnerStats && (
              <span style={styles.tabCount}>{partnerStats.totalClicks}</span>
            )}
            {t.id !== "dashboard" &&
              t.id !== "searches" &&
              t.id !== "cookies" &&
              t.id !== "compare" &&
              t.id !== "pageviews" &&
              t.id !== "pageviewsCompare" &&
              t.id !== "pageviewsTrend" &&
              t.id !== "coachApp" &&
              t.id !== "coachFunnel" &&
              t.id !== "affiliate" &&
              t.id !== "partnerClicks" &&
              report && <span style={styles.tabCount}>{countFor(report, t.id)}</span>}
          </button>
        ))}
      </nav>

      <main style={styles.content}>
        {tab === "dashboard" ? (
          <Dashboard
            pageViewStats={pageViewStats}
            coachAppViewStats={coachAppViewStats}
            affiliateStats={affiliateStats}
            pageViewError={pageViewError}
          />
        ) : tab === "searches" ? (
          <SearchesList
            stats={searchStats}
            error={searchError}
            days={searchDays}
            onDaysChange={(d) => {
              setSearchDate("");
              setSearchDays(d);
            }}
            date={searchDate}
            onDateChange={setSearchDate}
          />
        ) : tab === "cookies" ? (
          <>
            {!consentStats && !consentError && (
              <p style={styles.muted}>Loading cookie consent report...</p>
            )}
            {consentError && <p style={styles.error}>{consentError}</p>}
            {consentStats && <CookieConsentReport stats={consentStats} />}
          </>
        ) : tab === "compare" ? (
          <CompareDays />
        ) : tab === "pageviews" ? (
          <>
            {!pageViewStats && !pageViewError && (
              <p style={styles.muted}>Loading page view report...</p>
            )}
            {pageViewError && <p style={styles.error}>{pageViewError}</p>}
            {pageViewStats && <PageViewsReport stats={pageViewStats} />}
          </>
        ) : tab === "pageviewsCompare" ? (
          <ComparePageViews />
        ) : tab === "pageviewsTrend" ? (
          <PageViewTrend observedPaths={pageViewStats?.topPaths.map((p) => p.path) ?? []} />
        ) : tab === "countries" ? (
          <CountriesReport />
        ) : tab === "coachApp" ? (
          <>
            {!coachAppViewStats && !coachAppViewError && (
              <p style={styles.muted}>Loading Coach App view report...</p>
            )}
            {coachAppViewError && <p style={styles.error}>{coachAppViewError}</p>}
            {coachAppViewStats && <CoachAppTab stats={coachAppViewStats} />}
          </>
        ) : tab === "coachFunnel" ? (
          <>
            {!funnel && !funnelError && <p style={styles.muted}>Loading Coach App funnel...</p>}
            {funnelError && <p style={styles.error}>{funnelError}</p>}
            {funnel && (
              <CoachAppFunnelTab funnel={funnel} bannerVariants={coachAppViewStats?.bannerVariants} />
            )}
          </>
        ) : tab === "affiliate" ? (
          <>
            {!affiliateStats && !affiliateError && (
              <p style={styles.muted}>Loading affiliate click report...</p>
            )}
            {affiliateError && <p style={styles.error}>{affiliateError}</p>}
            {affiliateStats && <AffiliateClicksReport stats={affiliateStats} />}
          </>
        ) : tab === "partnerClicks" ? (
          <>
            {!partnerStats && !partnerError && (
              <p style={styles.muted}>Loading Football DNA click report...</p>
            )}
            {partnerError && <p style={styles.error}>{partnerError}</p>}
            {partnerStats && <PartnerClicksReport stats={partnerStats} />}
          </>
        ) : (
          <>
            {loading && <p style={styles.muted}>Loading report...</p>}
            {error && <p style={styles.error}>{error}</p>}
            {report && !loading && !error && (
              <>
                {tab === "silence" && <SilenceList rows={report.silence} />}
                {tab === "noImpressions" && (
                  <NoImpressionsList rows={report.noImpressions} days={noImpressionsDays} onDaysChange={setNoImpressionsDays} />
                )}
                {tab === "striking" && (
                  <StrikingList rows={report.strikingDistance} days={strikingDays} onDaysChange={setStrikingDays} />
                )}
                {tab === "ctr" && <LowCtrList rows={report.lowCtr} days={ctrDays} onDaysChange={setCtrDays} />}
                {tab === "decay" && <DecayList rows={report.decay} />}
                {tab === "cannibal" && <CannibalList rows={report.cannibalisation} />}
                {tab === "rank" && (
                  <RankTrackerSection rows={report.rankTracker} summary={report.rankTrackerSummary} />
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function countFor(report: SeoReport, tab: Tab): number {
  switch (tab) {
    case "silence":
      return report.silence.length;
    case "noImpressions":
      return report.noImpressions.length;
    case "striking":
      return report.strikingDistance.length;
    case "ctr":
      return report.lowCtr.length;
    case "decay":
      return report.decay.length;
    case "cannibal":
      return report.cannibalisation.length;
    case "rank":
      // Not rankTracker.length - that includes rows with a null
      // recentPosition (had impressions in the prior window but none in
      // the current one, so GSC has no position for them right now), which
      // would make the tab badge disagree with the "Total tracked" tile
      // shown inside the tab itself. This matches that tile exactly.
      return report.rankTrackerSummary.total.current;
    case "searches":
      return 0;
    case "cookies":
      return 0;
    case "affiliate":
      return 0;
    case "partnerClicks":
      return 0;
    case "compare":
      return 0;
    case "pageviews":
      return 0;
    case "pageviewsCompare":
      return 0;
    case "pageviewsTrend":
      return 0;
    case "countries":
      return 0;
    case "coachApp":
      return 0;
    case "coachFunnel":
      return 0;
    case "dashboard":
      return 0;
  }
}

// `value` is null when something else (a specific-day picker) is overriding
// the rolling window, so no window button shows as selected.
function PeriodFilter({ value, onChange }: { value: DayWindow | null; onChange: (days: DayWindow) => void }) {
  const options: { id: DayWindow; label: string }[] = [
    { id: 7, label: "7 days" },
    { id: 28, label: "28 days" },
    { id: 90, label: "3 months" },
  ];
  return (
    <div style={styles.metricToggle}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{ ...styles.toggleButton, ...(value === o.id ? styles.toggleButtonActive : {}) }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p style={styles.muted}>{text}</p>;
}

function SilenceList({ rows }: { rows: SilenceRow[] }) {
  if (!rows.length) return <EmptyState text="Nothing has gone quiet - all pages with real prior traffic still have recent impressions." />;
  return (
    <div style={styles.list}>
      <SectionNote label="How to read this">
        Real prior traffic, near-zero in the recent window. Usually technical
        (deindexing, noindex, canonical, a bad deploy), not a content issue.
        Check URL Inspection / Test Live URL before editing anything.
      </SectionNote>
      {rows.map((r, i) => (
        <div key={i} style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardQuery}>{shortPage(r.page)}</span>
            <span style={{ ...styles.cardBadge, ...styles.cardBadgeWarn }}>quiet</span>
          </div>
          <div style={styles.cardStats}>
            <span>was {r.baselineImpressions} impr / {r.baselineDays}d</span>
            <span>now {r.recentImpressions} impr / {r.recentDays}d</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type StrikingPageGroup = {
  page: string;
  queries: StrikingRow[];
  totalImpressions: number;
  totalClicks: number;
  avgPosition: number;
  bestPosition: number;
};

// Multiple queries in striking distance on the same page is a stronger
// signal than any one of them alone - one push (a section, an internal
// link, a title tweak) can move several terms at once. Sorted by term
// count first so those pages surface before any single-query outlier
// with high impressions.
function groupStrikingByPage(rows: StrikingRow[]): StrikingPageGroup[] {
  const byPage = new Map<string, StrikingRow[]>();
  for (const r of rows) {
    if (!byPage.has(r.page)) byPage.set(r.page, []);
    byPage.get(r.page)!.push(r);
  }
  return [...byPage.entries()]
    .map(([page, queries]) => {
      const sortedQueries = [...queries].sort((a, b) => a.position - b.position);
      const totalImpressions = queries.reduce((sum, q) => sum + q.impressions, 0);
      const totalClicks = queries.reduce((sum, q) => sum + q.clicks, 0);
      const avgPosition = Math.round((queries.reduce((sum, q) => sum + q.position, 0) / queries.length) * 10) / 10;
      return {
        page,
        queries: sortedQueries,
        totalImpressions,
        totalClicks,
        avgPosition,
        bestPosition: sortedQueries[0].position,
      };
    })
    .sort((a, b) => b.queries.length - a.queries.length || b.totalImpressions - a.totalImpressions);
}

function StrikingByPageList({ groups }: { groups: StrikingPageGroup[] }) {
  if (!groups.length) return <EmptyState text="Nothing on page 2 right now." />;
  return (
    <>
      {groups.map((g) => (
        <div key={g.page} style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardQuery}>{shortPage(g.page)}</span>
            <span style={styles.cardBadge}>{g.queries.length} term{g.queries.length === 1 ? "" : "s"}</span>
          </div>
          <div style={styles.cardStats}>
            <span>avg pos {g.avgPosition}</span>
            <span>best #{g.bestPosition}</span>
            <span>{g.totalImpressions} impr total</span>
            <span>{g.totalClicks} clicks total</span>
          </div>
          {g.queries.map((q, j) => (
            <div key={j} style={styles.cannibalRow}>
              <span style={styles.cardPage}>{q.query}</span>
              <span style={styles.cardStatsInline}>
                #{q.position} - {q.impressions} impr
              </span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

type StrikingGroupBy = "query" | "page";

function StrikingList({
  rows,
  days,
  onDaysChange,
}: {
  rows: StrikingRow[];
  days: DayWindow;
  onDaysChange: (d: DayWindow) => void;
}) {
  const [groupBy, setGroupBy] = useState<StrikingGroupBy>("query");

  return (
    <div style={styles.list}>
      <PeriodFilter value={days} onChange={onDaysChange} />
      <div style={styles.metricToggle}>
        <button
          onClick={() => setGroupBy("query")}
          style={{ ...styles.toggleButton, ...(groupBy === "query" ? styles.toggleButtonActive : {}) }}
        >
          By query
        </button>
        <button
          onClick={() => setGroupBy("page")}
          style={{ ...styles.toggleButton, ...(groupBy === "page" ? styles.toggleButtonActive : {}) }}
        >
          By page
        </button>
      </div>
      {!rows.length && <EmptyState text="Nothing on page 2 right now." />}
      {groupBy === "query" &&
        rows.map((r, i) => (
          <div key={i} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={styles.cardQuery}>{r.query}</span>
              <span style={styles.cardBadge}>#{r.position}</span>
            </div>
            <p style={styles.cardPage}>{shortPage(r.page)}</p>
            <div style={styles.cardStats}>
              <span>{r.impressions} impr</span>
              <span>{r.clicks} clicks</span>
              <span>{r.ctr}% CTR</span>
            </div>
          </div>
        ))}
      {groupBy === "page" && <StrikingByPageList groups={groupStrikingByPage(rows)} />}
    </div>
  );
}

function LowCtrList({
  rows,
  days,
  onDaysChange,
}: {
  rows: LowCtrRow[];
  days: DayWindow;
  onDaysChange: (d: DayWindow) => void;
}) {
  return (
    <div style={styles.list}>
      <PeriodFilter value={days} onChange={onDaysChange} />
      {!rows.length && <EmptyState text="No pages underperforming on CTR." />}
      {rows.slice(0, 60).map((r, i) => (
        <div key={i} style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardQuery}>{shortPage(r.page)}</span>
            <span style={styles.cardBadge}>#{r.position}</span>
          </div>
          <div style={styles.cardStats}>
            <span>{r.impressions} impr</span>
            <span>
              {r.actualCtr}% vs {r.expectedCtr}% expected
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function NoImpressionsList({
  rows,
  days,
  onDaysChange,
}: {
  rows: NoImpressionsRow[];
  days: DayWindow;
  onDaysChange: (d: DayWindow) => void;
}) {
  return (
    <div style={styles.list}>
      <PeriodFilter value={days} onChange={onDaysChange} />
      <SectionNote label="How to read this">
        Every sitemap URL with zero impressions in this window - pages that
        have either stopped ranking entirely or never picked up any search
        visibility. Candidates for a rewrite, not just a tweak.
      </SectionNote>
      {!rows.length && (
        <EmptyState text="Every sitemap URL picked up at least one impression in this window." />
      )}
      {rows.map((r, i) => (
        <div key={i} style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardQuery}>{r.page}</span>
            <span style={{ ...styles.cardBadge, ...styles.cardBadgeWarn }}>0 impr</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DecayList({ rows }: { rows: DecayRow[] }) {
  if (!rows.length) return <EmptyState text="No pages showing a click drop right now." />;
  return (
    <div style={styles.list}>
      {rows.slice(0, 60).map((r, i) => (
        <div key={i} style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardQuery}>{shortPage(r.page)}</span>
            <span style={{ ...styles.cardBadge, ...styles.cardBadgeWarn }}>
              -{r.dropPct}%
            </span>
          </div>
          <div style={styles.cardStats}>
            <span>
              {r.priorClicks} to {r.currentClicks} clicks
            </span>
            <span>
              pos {r.priorPosition} to {r.currentPosition}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CannibalList({ rows }: { rows: CannibalRow[] }) {
  if (!rows.length) return <EmptyState text="No queries splitting across multiple pages." />;
  return (
    <div style={styles.list}>
      {rows.slice(0, 30).map((r, i) => (
        <div key={i} style={styles.card}>
          <p style={styles.cardQuery}>{r.query}</p>
          {r.pages.map((p, j) => (
            <div key={j} style={styles.cannibalRow}>
              <span style={styles.cardPage}>{shortPage(p.page)}</span>
              <span style={styles.cardStatsInline}>
                #{p.position} - {p.impressions} impr
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function directionLabel(r: RankRow): string {
  switch (r.direction) {
    case "up":
      return `▲ ${r.delta} (was #${r.priorPosition})`;
    case "down":
      return `▼ ${Math.abs(r.delta ?? 0)} (was #${r.priorPosition})`;
    case "new":
      return "new this week";
    case "lost":
      return `no longer ranking (was #${r.priorPosition})`;
    default:
      return "no change";
  }
}

function directionStyle(direction: RankRow["direction"]): CSSProperties {
  if (direction === "up" || direction === "new") return { color: "#8fd19e" };
  if (direction === "down" || direction === "lost") return { color: "#e07856" };
  return { color: "#9c8a72" };
}

type DirectionFilter = "all" | "improved" | "new" | "declined" | "lost";

// Improved and Declined are the wide buckets; New and Lost are the strict
// subsets sitting inside each - queries that weren't ranking at all a week
// ago, and queries that stopped ranking altogether, without the ones that
// merely moved up or down mixed in. Declined was called "Lost" before the
// strict Lost filter existed, which made one label mean two things.
const DIRECTION_FILTERS: { id: DirectionFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "improved", label: "Improved" },
  { id: "new", label: "New" },
  { id: "declined", label: "Declined" },
  { id: "lost", label: "Lost" },
];

function matchesDirectionFilter(direction: RankRow["direction"], filter: DirectionFilter): boolean {
  if (filter === "improved") return direction === "up" || direction === "new";
  if (filter === "new") return direction === "new";
  if (filter === "declined") return direction === "down" || direction === "lost";
  if (filter === "lost") return direction === "lost";
  return true;
}

function deltaLabel(change: number): string {
  if (change > 0) return `▲ +${change}`;
  if (change < 0) return `▼ ${change}`;
  return "no change";
}

function deltaColor(change: number): CSSProperties {
  if (change > 0) return { color: "#8fd19e" };
  if (change < 0) return { color: "#e07856" };
  return { color: "#9c8a72" };
}

function RankSummaryTile({
  bucket,
  active,
  onSelect,
}: {
  bucket: RankSummaryBucket;
  active: boolean;
  onSelect: (bucket: RankSummaryBucket) => void;
}) {
  // Bands starting at position 0 (total, top3) have nothing to run a
  // cumulative total against - the band count already is the cumulative one.
  const showCumulative = bucket.minExclusive > 0;
  return (
    <button
      onClick={() => onSelect(bucket)}
      style={{
        ...styles.card,
        ...styles.summaryTileButton,
        ...(active ? styles.summaryTileButtonActive : {}),
      }}
    >
      <p style={styles.cardPage}>{bucket.label}</p>
      <div style={styles.cardTop}>
        <span style={{ ...styles.cardQuery, fontSize: 20 }}>{bucket.current}</span>
        <span style={{ ...styles.cardBadge, ...deltaColor(bucket.change) }}>{deltaLabel(bucket.change)}</span>
      </div>
      {showCumulative && (
        <p style={{ ...styles.cardStatsInline, marginTop: 4 }}>
          {bucket.cumulativeCurrent} in top {bucket.maxInclusive} overall ({deltaLabel(bucket.cumulativeChange)})
        </p>
      )}
      <p style={{ ...styles.cardStatsInline, marginTop: showCumulative ? 2 : 4 }}>was {bucket.prior} a week ago</p>
    </button>
  );
}

function RankTrackerSummaryView({
  summary,
  selected,
  onSelect,
}: {
  summary: RankTrackerSummaryData;
  selected: RankSummaryBucket | null;
  onSelect: (bucket: RankSummaryBucket) => void;
}) {
  const tiles = [summary.total, summary.top3, summary.top10, summary.top20, summary.top100];
  return (
    <div style={{ ...styles.list, marginBottom: 16 }}>
      <SectionNote label="How the tiles are counted">
        Keywords tracked and where they rank right now, compared to the same
        window a week ago - the same 3-day-average positions as the table
        below. Each tile counts only the keywords actually sitting in that
        band (top 10 excludes the ones already in top 3), with the
        traditional cumulative &ldquo;top N&rdquo; total shown underneath.
        Click a tile to see which queries and pages are in it.
      </SectionNote>
      <div style={styles.summaryGrid}>
        {tiles.map((bucket) => (
          <RankSummaryTile
            key={bucket.label}
            bucket={bucket}
            active={selected?.label === bucket.label}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function RankTrackerSection({ rows, summary }: { rows: RankRow[]; summary: RankTrackerSummaryData }) {
  const [selected, setSelected] = useState<RankSummaryBucket | null>(null);

  const handleSelect = (bucket: RankSummaryBucket) => {
    setSelected((current) => (current?.label === bucket.label ? null : bucket));
  };

  const visibleRows = selected
    ? rows.filter(
        (r) =>
          r.recentPosition !== null &&
          r.recentPosition > selected.minExclusive &&
          (selected.maxInclusive === null || r.recentPosition <= selected.maxInclusive)
      )
    : rows;

  return (
    <>
      <RankTrackerSummaryView summary={summary} selected={selected} onSelect={handleSelect} />
      {selected && (
        <div style={styles.metricToggle}>
          <span style={styles.sectionNote}>
            Showing {selected.label.toLowerCase()} - {visibleRows.length} quer{visibleRows.length === 1 ? "y" : "ies"}
          </span>
          <button style={styles.toggleButton} onClick={() => setSelected(null)}>
            Clear
          </button>
        </div>
      )}
      <RankTrackerList rows={visibleRows} allRows={rows} />
    </>
  );
}

type RankSortMetric = "position" | "impressions" | "clicks";
type RankGroupBy = "query" | "page";

type RankPageGroup = {
  page: string;
  queries: RankRow[];
  totalImpressions: number;
  totalClicks: number;
  avgPosition: number | null;
  bestPosition: number | null;
  improved: number;
  declined: number;
};

// Mirrors the striking-distance "by page" view: a page ranking for several
// terms at once is a stronger prioritisation signal than any one term in
// isolation, and this is also how you spot every term a given page ranks
// for (rather than hunting one query at a time in the flat list).
function groupRankByPage(rows: RankRow[]): RankPageGroup[] {
  const byPage = new Map<string, RankRow[]>();
  for (const r of rows) {
    if (!byPage.has(r.page)) byPage.set(r.page, []);
    byPage.get(r.page)!.push(r);
  }
  return [...byPage.entries()]
    .map(([page, queries]) => {
      const ranking = queries.filter((q) => q.recentPosition !== null);
      const sortedQueries = [...queries].sort(
        (a, b) => (a.recentPosition ?? Infinity) - (b.recentPosition ?? Infinity)
      );
      const totalImpressions = queries.reduce((sum, q) => sum + q.recentImpressions, 0);
      const totalClicks = queries.reduce((sum, q) => sum + q.recentClicks, 0);
      const avgPosition = ranking.length
        ? Math.round((ranking.reduce((sum, q) => sum + (q.recentPosition ?? 0), 0) / ranking.length) * 10) / 10
        : null;
      const bestPosition = ranking.length ? Math.min(...ranking.map((q) => q.recentPosition!)) : null;
      const improved = queries.filter((q) => q.direction === "up" || q.direction === "new").length;
      const declined = queries.filter((q) => q.direction === "down" || q.direction === "lost").length;
      return {
        page,
        queries: sortedQueries,
        totalImpressions,
        totalClicks,
        avgPosition,
        bestPosition,
        improved,
        declined,
      };
    })
    .sort((a, b) => b.queries.length - a.queries.length || b.totalImpressions - a.totalImpressions);
}

function RankByPageList({ groups }: { groups: RankPageGroup[] }) {
  if (!groups.length) return <EmptyState text="Nothing matches this filter." />;
  return (
    <>
      {groups.map((g) => (
        <div key={g.page} style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardQuery}>{shortPage(g.page)}</span>
            <span style={styles.cardBadge}>{g.queries.length} term{g.queries.length === 1 ? "" : "s"}</span>
          </div>
          <div style={styles.cardStats}>
            <span>avg pos {g.avgPosition ?? "-"}</span>
            <span>best #{g.bestPosition ?? "-"}</span>
            <span>{g.totalImpressions} impr</span>
            <span style={{ color: "#8fd19e" }}>{g.improved} up</span>
            <span style={{ color: "#e07856" }}>{g.declined} down</span>
          </div>
          {g.queries.map((q, j) => (
            <div key={j} style={styles.cannibalRow}>
              <span style={{ ...styles.cardPage, ...directionStyle(q.direction) }}>{q.query}</span>
              <span style={styles.cardStatsInline}>
                {q.recentPosition !== null ? `#${q.recentPosition}` : "-"} - {directionLabel(q)}
              </span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// allRows is the unfiltered tracker (rows may already be narrowed by a
// position-band tile) - used only to tell "this page ranks for nothing at all"
// apart from "this page's queries are filtered out of the current view".
function RankTrackerList({ rows, allRows }: { rows: RankRow[]; allRows: RankRow[] }) {
  const [metric, setMetric] = useState<RankSortMetric>("impressions");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [groupBy, setGroupBy] = useState<RankGroupBy>("query");
  const [pageQuery, setPageQuery] = useState("");
  const [selectedPage, setSelectedPage] = useState("");
  const [pageSuggestionsOpen, setPageSuggestionsOpen] = useState(false);

  if (!rows.length) {
    return <EmptyState text="Not enough recent search volume yet to track keyword movement." />;
  }

  // Suggestions are every page on the site, not just the pages that already
  // have tracked queries - a page ranking for nothing is exactly the case you
  // want to be able to look up and see stated, rather than an empty search box
  // that leaves you wondering whether the report is broken. Matching is done in
  // path space (shortPage) so the sitemap route list and GSC's full URLs line up.
  const rankedPaths = allRows.map((r) => shortPage(r.page));
  const pageOptions = allPagePaths(rankedPaths);
  const pageMatchCount =
    pageQuery.trim().length > 0 ? pageOptions.filter((p) => matchesPageSearch(p, pageQuery)).length : 0;
  const pageSuggestions =
    pageQuery.trim().length > 0 ? searchPaths(pageOptions, pageQuery, MAX_SUGGESTIONS) : [];

  function selectPage(p: string) {
    setPageQuery(p);
    setSelectedPage(p);
    setPageSuggestionsOpen(false);
  }

  function clearPageFilter() {
    setPageQuery("");
    setSelectedPage("");
    setPageSuggestionsOpen(false);
  }

  // Counted off the tile-narrowed rows, not the post-filter list, so each
  // button says how many it would show rather than how many is on screen.
  // Improved and Declined overlap New and Lost by design, so these
  // deliberately do not sum to the All count.
  const directionCount = (filter: DirectionFilter) =>
    rows.filter((r) => matchesDirectionFilter(r.direction, filter)).length;
  const filtered = rows.filter((r) => matchesDirectionFilter(r.direction, directionFilter));
  const pageFiltered = selectedPage ? filtered.filter((r) => shortPage(r.page) === selectedPage) : filtered;
  const visible = [...pageFiltered].sort((a, b) => {
    if (metric === "position") {
      // Lower position is better; queries with no current position (lost) sort last.
      return (a.recentPosition ?? Infinity) - (b.recentPosition ?? Infinity);
    }
    const aVal = metric === "impressions" ? a.recentImpressions : a.recentClicks;
    const bVal = metric === "impressions" ? b.recentImpressions : b.recentClicks;
    return bVal - aVal;
  });

  return (
    <div style={styles.list}>
      <div style={styles.compareRow}>
        <label style={{ ...styles.compareLabel, position: "relative" }}>
          Search for a page to see all its terms
          <input
            value={pageQuery}
            onChange={(e) => {
              setPageQuery(e.target.value);
              setPageSuggestionsOpen(true);
              if (selectedPage && e.target.value !== selectedPage) {
                setSelectedPage("");
              }
            }}
            onFocus={() => setPageSuggestionsOpen(true)}
            onBlur={() => setPageSuggestionsOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (pageSuggestions.length > 0) selectPage(pageSuggestions[0]);
              } else if (e.key === "Escape") {
                setPageSuggestionsOpen(false);
              }
            }}
            placeholder="Search e.g. veo, boots, academy..."
            style={styles.pathInput}
          />
          {pageSuggestionsOpen && pageQuery.trim().length > 0 && (
            <div style={styles.suggestionList}>
              {pageSuggestions.map((p) => (
                <div
                  key={p}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPage(p)}
                  style={styles.suggestionItem}
                >
                  {p}
                  {!rankedPaths.includes(p) && <span style={styles.suggestionTag}>no tracked queries</span>}
                </div>
              ))}
              {pageSuggestions.length === 0 && (
                <div style={styles.suggestionEmpty}>
                  No page on the site matches &ldquo;{pageQuery.trim()}&rdquo;.
                </div>
              )}
              {pageMatchCount > pageSuggestions.length && (
                <div style={styles.suggestionEmpty}>
                  +{pageMatchCount - pageSuggestions.length} more - keep typing to narrow it down.
                </div>
              )}
            </div>
          )}
        </label>
        {(pageQuery || selectedPage) && (
          <button type="button" onClick={clearPageFilter} style={styles.toggleButton}>
            Clear
          </button>
        )}
      </div>

      {selectedPage ? (
        <>
          <p style={styles.sectionNote}>
            Every tracked query for {selectedPage}, sorted by current position.
          </p>
          {pageFiltered.length === 0 ? (
            <EmptyState
              text={
                rankedPaths.includes(selectedPage)
                  ? `${selectedPage} has tracked queries, but none of them match the filters currently applied - clear the position-band tile above and set direction back to All.`
                  : `${selectedPage} has no query in the rank tracker right now. That is a real answer rather than a failed search: the tracker only lists a query once it has 4+ impressions across the two 3-day windows it compares (the last 3 days, and the same 3 days a week earlier), so a page picking up a couple of impressions a week won't appear here even though Search Console shows them. Use Compare days, or inspect the page, for the longer view.`
              }
            />
          ) : (
            <RankByPageList groups={groupRankByPage(pageFiltered)} />
          )}
        </>
      ) : (
        <>
          <div style={styles.metricToggle}>
            <button
              onClick={() => setGroupBy("query")}
              style={{ ...styles.toggleButton, ...(groupBy === "query" ? styles.toggleButtonActive : {}) }}
            >
              By query
            </button>
            <button
              onClick={() => setGroupBy("page")}
              style={{ ...styles.toggleButton, ...(groupBy === "page" ? styles.toggleButtonActive : {}) }}
            >
              By page
            </button>
          </div>
          {groupBy === "query" && (
            <div style={styles.metricToggle}>
              <button
                onClick={() => setMetric("position")}
                style={{ ...styles.toggleButton, ...(metric === "position" ? styles.toggleButtonActive : {}) }}
              >
                Sort: position
              </button>
              <button
                onClick={() => setMetric("impressions")}
                style={{ ...styles.toggleButton, ...(metric === "impressions" ? styles.toggleButtonActive : {}) }}
              >
                Sort: impressions
              </button>
              <button
                onClick={() => setMetric("clicks")}
                style={{ ...styles.toggleButton, ...(metric === "clicks" ? styles.toggleButtonActive : {}) }}
              >
                Sort: clicks
              </button>
            </div>
          )}
          <div style={styles.metricToggle}>
            {DIRECTION_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setDirectionFilter(f.id)}
                style={{
                  ...styles.toggleButton,
                  ...(directionFilter === f.id ? styles.toggleButtonActive : {}),
                }}
              >
                {f.label} ({directionCount(f.id)})
              </button>
            ))}
          </div>
          <SectionNote label="How position and direction are worked out">
            Position today is a 3-day average ending today (GSC data lags a
            few days), compared against the same 3 days one week earlier - a
            single day is too noisy to trust for most queries. New/improved
            queries are shown in green, lost ones in red. Improved covers
            queries that moved up plus ones that are new, and Declined covers
            ones that moved down plus ones that stopped ranking; New and Lost
            narrow each to just the queries that had no position a week ago,
            and that have none now. New and Lost therefore sit inside
            Improved and Declined rather than beside them, so the five counts
            do not sum to the total.
          </SectionNote>
          {groupBy === "page" && <RankByPageList groups={groupRankByPage(pageFiltered)} />}
          {groupBy === "query" && (
            <>
              {!visible.length && <EmptyState text="Nothing matches this filter." />}
              {visible.map((r, i) => {
                const recentVal = metric === "impressions" ? r.recentImpressions : r.recentClicks;
                const priorVal = metric === "impressions" ? r.priorImpressions : r.priorClicks;
                const unit = metric === "impressions" ? "impr" : "clicks";
                return (
                  <div key={i} style={styles.card}>
                    <div style={styles.cardTop}>
                      <span style={{ ...styles.cardQuery, ...directionStyle(r.direction) }}>{r.query}</span>
                      <span style={styles.cardBadge}>
                        {r.recentPosition !== null ? `#${r.recentPosition}` : "-"}
                      </span>
                    </div>
                    <p style={styles.cardPage}>{shortPage(r.page)}</p>
                    <div style={styles.cardStats}>
                      <span style={directionStyle(r.direction)}>{directionLabel(r)}</span>
                      {metric !== "position" && (
                        <span>
                          {recentVal} {unit} (was {priorVal})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}

function SearchesList({
  stats,
  error,
  days,
  onDaysChange,
  date,
  onDateChange,
}: {
  stats: SearchLogStats | null;
  error: string;
  days: DayWindow;
  onDaysChange: (d: DayWindow) => void;
  date: string;
  onDateChange: (date: string) => void;
}) {
  const windowLabel = date ? `on ${date}` : days === 7 ? "over the last 7 days" : days === 28 ? "over the last 28 days" : "over the last 3 months";
  return (
    <div style={styles.list}>
      <SectionNote label="What's counted here">
        What visitors typed into on-site search {windowLabel}, including the
        header dropdown search (not just the /search results page). Queries
        flagged &ldquo;0 results&rdquo; are the clearest content-gap signal -
        people looking for something we don&rsquo;t have an article for yet.
        Part-typed queries (a shorter search followed within two minutes by a
        longer one that starts with it) are folded into the search the
        visitor finished typing, rather than each counting as its own
        0-result search.
      </SectionNote>

      <div style={styles.compareRow}>
        <PeriodFilter value={date ? null : days} onChange={onDaysChange} />
        <label style={styles.compareLabel}>
          Or one day
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => onDateChange(e.target.value)}
            style={styles.dateInput}
          />
        </label>
        {date && (
          <button type="button" onClick={() => onDateChange("")} style={styles.toggleButton}>
            Clear day
          </button>
        )}
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {!stats && !error && <p style={styles.muted}>Loading search report...</p>}

      {stats && (
        <>
          <div style={styles.cardStats}>
            <span>Searches: {stats.totalSearches}</span>
            <span>Found something: {stats.successfulSearches}</span>
            <span>No results: {stats.zeroResultSearches}</span>
            <span>Success rate: {pct(stats.successRate)}</span>
            {stats.collapsedFragments > 0 && (
              <span style={styles.cardStatsInline}>
                {stats.collapsedFragments} part-typed fragments folded in
              </span>
            )}
          </div>

          {!stats.rows.length && <EmptyState text="No searches logged in this window." />}

          {stats.rows.slice(0, 100).map((r) => (
            <div key={r.query} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{r.query}</span>
                <span style={styles.cardBadge}>{r.count}x</span>
              </div>
              <div style={styles.cardStats}>
                {r.successCount > 0 && <span>{r.successCount} found results</span>}
                {r.zeroResultCount > 0 && (
                  <span style={{ ...styles.cardBadge, ...styles.cardBadgeWarn }}>
                    {r.zeroResultCount} with 0 results
                  </span>
                )}
                {!date && <span style={styles.cardStatsInline}>last {r.lastSeen}</span>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ISO 3166-1 alpha-2 -> "United Kingdom". Falls back to the code itself for
// anything Intl does not know, and "Unknown" passes straight through.
const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl
  ? new Intl.DisplayNames(["en-GB"], { type: "region" })
  : null;
function countryName(code: string): string {
  if (code === "Unknown") return "Unknown (logged before country tracking)";
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

function CountryRows({ rows, max }: { rows: CountryViewRow[]; max: number }) {
  return (
    <>
      {rows.map((c) => (
        <div key={c.country} style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardQuery}>{countryName(c.country)}</span>
            <span style={styles.cardBadge}>{pct(c.share)}</span>
          </div>
          <div style={styles.cardStats}>
            <span>{c.views} views</span>
            <span>{c.estimatedVisits} visits</span>
          </div>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${max > 0 ? (c.views / max) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </>
  );
}

function CountriesReport() {
  const [days, setDays] = useState<DayWindow>(28);
  const [fetched, setFetched] = useState<{ days: DayWindow; data: PageViewCountryStats } | null>(null);
  const [error, setError] = useState("");
  const stats = fetched?.days === days ? fetched.data : null;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/page-view-country-report?days=${days}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load country report");
        }
        return res.json();
      })
      .then((data: PageViewCountryStats) => {
        if (cancelled) return;
        setFetched({ days, data });
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const maxCountry = stats?.countries[0]?.views ?? 0;
  const maxHour = stats ? Math.max(...stats.byHour.map((h) => h.views), 0) : 0;
  const maxEarly = stats?.earlyMorning.countries[0]?.views ?? 0;
  const unknownShare = stats && stats.totalViews > 0 ? 1 - stats.knownCountryViews / stats.totalViews : 0;

  return (
    <div style={styles.list}>
      <SectionNote label="How this is measured">
        Country comes from Vercel&rsquo;s geolocation of each request
        (x-vercel-ip-country), recorded as a two-letter code only, never the
        IP. Recording started on 24 September 2026, and this tab starts at the
        first view that has a country, so older traffic (all Unknown) is left
        out rather than diluting the split. A longer period than that shows
        the same data until enough time has passed.
        Hours are UK local time (Europe/London), not UTC. Same bot exclusions
        as the Page views tab, so the totals reconcile. A VPN or a mobile
        network&rsquo;s gateway can put a UK reader in another country, so
        treat a few percent of overseas as noise; a big overseas share piled
        onto one or two URLs is the shape that matters.
      </SectionNote>

      <PeriodFilter value={days} onChange={setDays} />

      {error && <p style={styles.error}>{error}</p>}
      {!stats && !error && <p style={styles.muted}>Loading country report...</p>}

      {stats && (
        <>
          <div style={styles.cardStats}>
            {stats.clampedToCountryStart && (
              <span>
                Since{" "}
                {new Date(stats.since).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}{" "}
                (when country recording started)
              </span>
            )}
            <span>Views: {stats.totalViews}</span>
            <span>With a country: {stats.knownCountryViews}</span>
            <span>Bots excluded: {stats.botViews}</span>
            {unknownShare > 0.5 && (
              <span style={{ ...styles.cardBadge, ...styles.cardBadgeWarn }}>
                {pct(unknownShare)} still Unknown - the country split needs a few days of data
              </span>
            )}
          </div>

          <p style={styles.affiliateHeading}>Views by country</p>
          {!stats.countries.length && <EmptyState text="No page views in this window." />}
          <CountryRows rows={stats.countries} max={maxCountry} />

          <p style={styles.affiliateHeading}>Before 06:30 UK time</p>
          <div style={styles.cardStats}>
            <span>{stats.earlyMorning.views} views</span>
            <span>{pct(stats.earlyMorning.share)} of the window</span>
          </div>
          {stats.earlyMorning.views === 0 ? (
            <EmptyState text="Nothing landed before 06:30 in this window." />
          ) : (
            <>
              <CountryRows rows={stats.earlyMorning.countries} max={maxEarly} />
              <p style={styles.muted}>What the early-morning traffic was reading:</p>
              {stats.earlyMorning.topPaths.map((p) => (
                <div key={p.path} style={styles.cannibalRow}>
                  <span style={styles.cardPage}>{shortPage(p.path)}</span>
                  <span style={styles.cardStatsInline}>{p.count} views</span>
                </div>
              ))}
            </>
          )}

          <p style={styles.affiliateHeading}>Views by hour of day (UK time)</p>
          <p style={styles.muted}>
            Each bar is the whole window&rsquo;s views in that hour. The split
            is UK / overseas / unknown.
          </p>
          {stats.byHour.map((h) => (
            <div key={h.hour} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{String(h.hour).padStart(2, "0")}:00</span>
                <span style={styles.cardBadge}>{h.views}</span>
              </div>
              <div style={styles.cardStats}>
                <span>UK {h.uk}</span>
                <span>Overseas {h.overseas}</span>
                <span>Unknown {h.unknown}</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width: `${maxHour > 0 ? (h.views / maxHour) * 100 : 0}%` }} />
              </div>
            </div>
          ))}

          <p style={styles.affiliateHeading}>What overseas readers open</p>
          {!stats.overseasTopPaths.length && <EmptyState text="No overseas views with a recorded country yet." />}
          {stats.overseasTopPaths.map((p) => (
            <div key={p.path} style={styles.cannibalRow}>
              <span style={styles.cardPage}>{shortPage(p.path)}</span>
              <span style={styles.cardStatsInline}>{p.count} views</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function friendlyGroup(group: string): string {
  return group === "Ads" ? "Google Ads" : group;
}

function placementLabel(placement: string): string {
  if (placement === "gear-picks") return "Quick picks";
  if (placement === "inline") return "Inline";
  return placement;
}

// The per-link breakdown under a product row: where each of its clicks came
// from (page + placement), so "the links at the top of the shin-pads article
// are working better" is something you can read off rather than guess. The
// href line only appears when a product has more than one distinct URL - the
// case that used to show as duplicate rows before products were collapsed by
// name.
function ProductLinkBreakdown({
  links,
}: {
  links: { href: string; placement: string; path: string; clicks: number }[];
}) {
  const multipleHrefs = new Set(links.map((l) => l.href)).size > 1;
  return (
    <>
      {links.map((l) => (
        <div key={`${l.path}|${l.placement}|${l.href}`} style={styles.cannibalRow}>
          <span style={styles.cardPage}>
            {shortPage(l.path)} · {placementLabel(l.placement)}
            {multipleHrefs && (
              <span style={{ display: "block", ...styles.cardStatsInline, wordBreak: "break-all" }}>{l.href}</span>
            )}
          </span>
          <span style={styles.cardStatsInline}>{l.clicks} clicks</span>
        </div>
      ))}
    </>
  );
}

// Source breakdown for one day, folding Internal (excluded from sourceGroups
// because it's on-site navigation, not a new visit) back in as its own line -
// for the Coach App section especially, internal traffic from the article
// banners is the number that matters.
function daySourceRows(day: PageViewDay): { label: string; count: number }[] {
  const rows = day.sourceGroups.map((g) => ({ label: friendlyGroup(g.group), count: g.count }));
  if (day.internalViews > 0) rows.push({ label: "Internal", count: day.internalViews });
  return rows.sort((a, b) => b.count - a.count);
}

function windowSourceRows(stats: PageViewStats): { label: string; count: number }[] {
  const rows = stats.sourceGroups.map((g) => ({ label: friendlyGroup(g.group), count: g.count }));
  if (stats.internalViews > 0) rows.push({ label: "Internal", count: stats.internalViews });
  return rows.sort((a, b) => b.count - a.count);
}

function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function SourceLine({ rows }: { rows: { label: string; count: number }[] }) {
  if (!rows.length) return <span style={styles.muted}>No external-referrer traffic.</span>;
  return (
    <div style={styles.cardStats}>
      {rows.map((r) => (
        <span key={r.label}>
          {r.label}: {r.count}
        </span>
      ))}
    </div>
  );
}

// A headline number with its day-over-day change. prior is null in whole-window
// mode, where there's nothing to compare against.
function DashboardStat({
  label,
  current,
  prior,
}: {
  label: string;
  current: number;
  prior: number | null;
}) {
  return (
    <div style={styles.cardTop}>
      <span style={{ ...styles.cardQuery, fontSize: 22 }}>
        {current.toLocaleString("en-GB")} <span style={{ fontSize: 13, fontWeight: 400 }}>{label}</span>
      </span>
      {prior !== null && (
        <span style={{ ...styles.cardBadge, ...deltaColor(current - prior) }}>
          {deltaLabel(current - prior)} vs prev day
        </span>
      )}
    </div>
  );
}

// Friendly names for the site's top-level sections, keyed by the first path
// segment. Anything not listed (legal pages, one-off routes) falls back to a
// title-cased version of its own segment, and the bare "/" is Home.
const CATEGORY_LABELS: Record<string, string> = {
  "academy-pathway": "Academy pathway",
  "academy-trials": "Academy trials",
  coaching: "Coaching",
  "football-development": "Football development",
  "football-gear": "Gear",
  "girls-football": "Girls' football",
  "parent-guides": "Parent guides",
  "football-parent-coach-app": "Coach App",
  "coach-app": "Coach App",
};

// The category a page belongs to is its first path segment, so a category
// index (/coaching) and every article under it (/coaching/...) roll up
// together. Root and single-segment pages become their own labelled row.
function categoryForPath(path: string): string {
  const seg = path.split(/[?#]/)[0].split("/").filter(Boolean)[0];
  if (!seg) return "Home";
  return CATEGORY_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

// Rolls a page-by-page view list up into per-category totals, biggest first.
// It sums exactly the paths handed in (the same capped topPaths list that
// feeds the page-by-page breakdown), so the two always reconcile.
function categoryTotals(paths: { path: string; count: number }[]): { label: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const { path, count } of paths) {
    const label = categoryForPath(path);
    totals.set(label, (totals.get(label) ?? 0) + count);
  }
  return [...totals.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function Dashboard({
  pageViewStats,
  coachAppViewStats,
  affiliateStats,
  pageViewError,
}: {
  pageViewStats: PageViewStats | null;
  coachAppViewStats: CoachAppViewStats | null;
  affiliateStats: AffiliateClickStats | null;
  pageViewError: string;
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const [visiblePathCount, setVisiblePathCount] = useState(TOP_PATHS_PAGE_SIZE);

  if (pageViewError) return <p style={styles.error}>{pageViewError}</p>;
  if (!pageViewStats) return <p style={styles.muted}>Loading dashboard...</p>;

  // Dates come from the site-wide page views (the most complete coverage).
  // Newest first already, so the first entry is the default: today.
  const dateOptions = pageViewStats.byDay.map((d) => d.date);
  const latest = dateOptions[0] ?? "";
  const today = new Date().toISOString().slice(0, 10);
  // "" means "use the latest day"; "all" means the whole 30-day window.
  const effective = selectedDate || latest;
  const isWindow = effective === "all";
  const viewsByDate = new Map(pageViewStats.byDay.map((d) => [d.date, d.count]));

  function selectDate(date: string) {
    setSelectedDate(date);
    setVisiblePathCount(TOP_PATHS_PAGE_SIZE);
  }

  // Site-wide page views for the chosen scope.
  const pvDay = isWindow ? null : pageViewStats.byDay.find((d) => d.date === effective) ?? null;
  const pvPrior = isWindow ? null : pageViewStats.byDay.find((d) => d.date === previousDay(effective)) ?? null;
  const pvTotal = isWindow ? pageViewStats.totalViews : pvDay?.count ?? 0;
  const pvPriorTotal = isWindow ? null : pvPrior?.count ?? 0;
  const pvSources = isWindow ? windowSourceRows(pageViewStats) : pvDay ? daySourceRows(pvDay) : [];

  // Coach App views for the chosen scope.
  const caDay =
    isWindow || !coachAppViewStats ? null : coachAppViewStats.byDay.find((d) => d.date === effective) ?? null;
  const caPrior =
    isWindow || !coachAppViewStats
      ? null
      : coachAppViewStats.byDay.find((d) => d.date === previousDay(effective)) ?? null;
  const caTotal = coachAppViewStats ? (isWindow ? coachAppViewStats.totalViews : caDay?.count ?? 0) : 0;
  const caPriorTotal = isWindow || !coachAppViewStats ? null : caPrior?.count ?? 0;
  const caSources = coachAppViewStats
    ? isWindow
      ? windowSourceRows(coachAppViewStats)
      : caDay
      ? daySourceRows(caDay)
      : []
    : [];

  // Affiliate clicks for the chosen scope.
  const afDay =
    isWindow || !affiliateStats ? null : affiliateStats.byDay.find((d) => d.date === effective) ?? null;
  const afPrior =
    isWindow || !affiliateStats
      ? null
      : affiliateStats.byDay.find((d) => d.date === previousDay(effective)) ?? null;
  const afTotal = affiliateStats ? (isWindow ? affiliateStats.totalClicks : afDay?.clicks ?? 0) : 0;
  const afPriorTotal = isWindow || !affiliateStats ? null : afPrior?.clicks ?? 0;
  const afProducts = affiliateStats ? (isWindow ? affiliateStats.byProduct : afDay?.byProduct ?? []) : [];

  // All pages and their views, in order, for the chosen scope.
  const allPaths = isWindow ? pageViewStats.topPaths : pvDay?.topPaths ?? [];
  const totalPathCount = isWindow ? pageViewStats.totalPathCount : pvDay?.totalPathCount ?? 0;
  const visiblePaths = allPaths.slice(0, visiblePathCount);

  // Per-category rollup of the same page list shown below, so you can read
  // "which sections are pulling the traffic" without adding it up by hand.
  const categorySummary = categoryTotals(allPaths);
  const categoryViewTotal = categorySummary.reduce((sum, c) => sum + c.count, 0);
  const maxCategoryViews = categorySummary[0]?.count ?? 0;

  return (
    <div style={styles.list}>
      <label style={styles.compareLabel}>
        Date
        <select value={effective} onChange={(e) => selectDate(e.target.value)} style={styles.dateInput}>
          {dateOptions.map((d, i) => (
            <option key={d} value={d}>
              {d}
              {i === 0 ? " (today)" : ""} ({viewsByDate.get(d) ?? 0} views)
            </option>
          ))}
          <option value="all">All (last 30 days)</option>
        </select>
      </label>

      {!isWindow && effective === today && (
        <p style={styles.sectionNote}>
          Today is still in progress, so its numbers are partial and the
          &ldquo;vs prev day&rdquo; change compares a part-day against a full
          one. Pick yesterday for the last complete day.
        </p>
      )}

      <h3 style={styles.affiliateHeading}>Page views (whole site)</h3>
      <div style={styles.card}>
        <DashboardStat label="page views" current={pvTotal} prior={pvPriorTotal} />
        <SourceLine rows={pvSources} />
      </div>

      <h3 style={styles.affiliateHeading}>Coach App views</h3>
      {!coachAppViewStats ? (
        <p style={styles.muted}>Loading Coach App views...</p>
      ) : (
        <div style={styles.card}>
          <DashboardStat label="Coach App views" current={caTotal} prior={caPriorTotal} />
          <SourceLine rows={caSources} />
        </div>
      )}

      <h3 style={styles.affiliateHeading}>Affiliate link clicks</h3>
      {!affiliateStats ? (
        <p style={styles.muted}>Loading affiliate clicks...</p>
      ) : (
        <>
          <div style={styles.card}>
            <DashboardStat label="Affiliate clicks" current={afTotal} prior={afPriorTotal} />
          </div>
          {afProducts.length === 0 ? (
            <p style={styles.muted}>No affiliate clicks in this window.</p>
          ) : (
            afProducts.map((row) => (
              <div key={row.name} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.cardQuery}>{row.name}</span>
                  <span style={styles.cardBadge}>{row.clicks} clicks</span>
                </div>
                <div style={styles.cardStats}>
                  <span>{row.merchant}</span>
                </div>
              </div>
            ))
          )}
        </>
      )}

      <h3 style={styles.affiliateHeading}>
        Views by category {isWindow ? "(last 30 days)" : `on ${effective}`}
      </h3>
      {categorySummary.length === 0 ? (
        <EmptyState text="No page views in this window." />
      ) : (
        categorySummary.map((c) => (
          <div key={c.label} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={styles.cardQuery}>{c.label}</span>
              <span style={styles.cardBadge}>{c.count.toLocaleString("en-GB")} views</span>
            </div>
            <div style={styles.cardStats}>
              <span>{categoryViewTotal > 0 ? Math.round((c.count / categoryViewTotal) * 100) : 0}% of listed views</span>
            </div>
            <div style={styles.barTrack}>
              <div style={{ ...styles.barFill, width: `${maxCategoryViews > 0 ? (c.count / maxCategoryViews) * 100 : 0}%` }} />
            </div>
          </div>
        ))
      )}

      <h3 style={styles.affiliateHeading}>
        All pages by views {isWindow ? "(last 30 days)" : `on ${effective}`}
      </h3>
      {allPaths.length === 0 ? (
        <EmptyState text="No page views in this window." />
      ) : (
        <>
          {visiblePaths.map((row) => (
            <div key={row.path} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{row.path}</span>
                <span style={styles.cardBadge}>{row.count} views</span>
              </div>
            </div>
          ))}
          {allPaths.length > visiblePathCount && (
            <button
              onClick={() => setVisiblePathCount((n) => n + TOP_PATHS_PAGE_SIZE)}
              style={styles.toggleButton}
            >
              Show more ({allPaths.length - visiblePathCount} of {totalPathCount} left)
            </button>
          )}
        </>
      )}
    </div>
  );
}

function AffiliateClicksReport({ stats }: { stats: AffiliateClickStats }) {
  const [selectedDate, setSelectedDate] = useState("");

  const pagesWithViews = stats.byPage.filter((p) => p.pageViews !== null);
  const totalViews = pagesWithViews.reduce((sum, p) => sum + (p.pageViews ?? 0), 0);
  const totalPageClicks = pagesWithViews.reduce((sum, p) => sum + p.clicks, 0);
  const overallRate = totalViews > 0 ? totalPageClicks / totalViews : null;

  const gearPicks = stats.byPlacement.find((p) => p.placement === "gear-picks")?.clicks ?? 0;
  const inline = stats.byPlacement.find((p) => p.placement === "inline")?.clicks ?? 0;

  // Only days that actually saw a click are worth offering in the picker - the
  // window is zero-filled, so most entries are empty days.
  const dayOptions = stats.byDay.filter((d) => d.clicks > 0);
  const selectedDay = selectedDate ? stats.byDay.find((d) => d.date === selectedDate) ?? null : null;

  return (
    <div style={styles.list}>
      <SectionNote label="What this measures, and what it doesn't">
        Every click on a link to an affiliate destination (Amazon, QuickPlay
        and any other affiliate programme in use on the site), logged
        first-party from the click itself rather than read back out of each
        merchant's own reporting. That is the point: Amazon Associates
        reports per tracking id from the moment a click reaches Amazon, so it
        cannot tell you which article the click came from, and it shows
        nothing at all on a day with no orders - other direct programmes have
        their own version of the same blind spot. This can. What it cannot
        see is the other side of the link: whether the click became an order
        and what it earned. That number only exists in each programme's own
        reporting. Read the two together - this one for which page and which
        product pull, the merchant's own dashboard for what the traffic was
        worth.
        {stats.botClicks > 0 && (
          <> {stats.botClicks} click{stats.botClicks === 1 ? " was" : "s were"} excluded as bot traffic.</>
        )}
      </SectionNote>

      <SectionNote label="Why the view counts here are lower than the Page views tab">
        Views are counted over the same window as the clicks, starting when
        click logging went live, not over the last {stats.days} days. These
        articles have months of view history from before any click could be
        recorded, so counting all of it would divide a few clicks by
        thousands of views and call the result a click-out rate. The first
        reading did exactly that: 1 click against 206 views, 205 of which
        happened before the tracker existed. The Page views tab still shows
        the full 30 days, so the two numbers are meant to differ.
      </SectionNote>

      <p style={styles.muted}>
        {stats.clampedToTrackingStart
          ? `Clicks and views both counted since ${new Date(stats.since).toLocaleString("en-GB")}, when click logging went live.`
          : `Clicks and views both counted over the last ${stats.days} days.`}
      </p>

      {dayOptions.length > 0 && (
        <label style={styles.compareLabel}>
          Pick a date to see that day&rsquo;s clicks by page and product
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.dateInput}
          >
            <option value="">All (whole window)</option>
            {dayOptions
              .slice()
              .reverse()
              .map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date} ({d.clicks} click{d.clicks === 1 ? "" : "s"})
                </option>
              ))}
          </select>
        </label>
      )}

      {stats.totalClicks === 0 ? (
        <EmptyState text="No affiliate clicks recorded yet. The tracker went live on 9 September 2026 - before that nothing was measured, so an empty window here is not the same as no clicks." />
      ) : selectedDay ? (
        <>
          <p style={styles.sectionNote}>
            {selectedDay.date} only - {selectedDay.clicks} click
            {selectedDay.clicks === 1 ? "" : "s"}. A single day is a small
            sample; clear the date for the click-out rate, which needs the
            whole window to mean anything.
          </p>

          <h3 style={styles.affiliateHeading}>By page on {selectedDay.date}</h3>
          {selectedDay.byPage.length === 0 && <EmptyState text="No clicks on this day." />}
          {selectedDay.byPage.map((row) => (
            <div key={row.path} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{row.path}</span>
                <span style={styles.cardBadge}>{row.clicks} clicks</span>
              </div>
            </div>
          ))}

          <h3 style={styles.affiliateHeading}>By product on {selectedDay.date}</h3>
          {selectedDay.byProduct.map((row) => (
            <div key={row.name} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{row.name}</span>
                <span style={styles.cardBadge}>{row.clicks} clicks</span>
              </div>
              <div style={styles.cardStats}>
                <span>{row.merchant}</span>
              </div>
              <ProductLinkBreakdown links={row.links} />
            </div>
          ))}
        </>
      ) : (
        <>
          <div style={styles.cardStats}>
            <span>Clicks: {stats.totalClicks}</span>
            <span>Click-out rate: {overallRate === null ? "-" : pct(overallRate)}</span>
            <span>Quick picks: {gearPicks}</span>
            <span>Inline links: {inline}</span>
          </div>

          <h3 style={styles.affiliateHeading}>By page</h3>
          {stats.byPage.map((row) => (
            <div key={row.path} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{row.path}</span>
                <span style={styles.cardBadge}>{row.clicks} clicks</span>
              </div>
              <div style={styles.cardStats}>
                <span>Views: {row.pageViews ?? "-"}</span>
                <span>
                  Click-out rate: {row.clickRate === null ? "-" : pct(row.clickRate)}
                </span>
              </div>
            </div>
          ))}

          <h3 style={styles.affiliateHeading}>By product</h3>
          {stats.byProduct.map((row) => (
            <div key={row.name} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{row.name}</span>
                <span style={styles.cardBadge}>{row.clicks} clicks</span>
              </div>
              <div style={styles.cardStats}>
                <span>{row.merchant}</span>
              </div>
              <ProductLinkBreakdown links={row.links} />
            </div>
          ))}

          <h3 style={styles.affiliateHeading}>By day</h3>
          <p style={styles.sectionNote}>Click a day to see its pages and products.</p>
          {dayOptions
            .slice()
            .reverse()
            .map((row) => (
              <div
                key={row.date}
                style={{ ...styles.card, cursor: "pointer" }}
                onClick={() => setSelectedDate(row.date)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedDate(row.date);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div style={styles.cardTop}>
                  <span style={styles.cardQuery}>{row.date}</span>
                  <span style={styles.cardBadge}>{row.clicks} clicks</span>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}

function PartnerClicksReport({ stats }: { stats: PartnerClickStats }) {
  const [selectedDate, setSelectedDate] = useState("");

  const pagesWithViews = stats.byPage.filter((p) => p.pageViews !== null);
  const totalViews = pagesWithViews.reduce((sum, p) => sum + (p.pageViews ?? 0), 0);
  const totalPageClicks = pagesWithViews.reduce((sum, p) => sum + p.clicks, 0);
  const overallRate = totalViews > 0 ? totalPageClicks / totalViews : null;

  // Only days that actually saw a click are worth offering - the window is
  // zero-filled, so most entries are empty days.
  const dayOptions = stats.byDay.filter((d) => d.clicks > 0);
  const selectedDay = selectedDate ? stats.byDay.find((d) => d.date === selectedDate) ?? null : null;

  return (
    <div style={styles.list}>
      <SectionNote label="What this measures, and what it doesn't">
        Every click on an outbound link to an editorial partner (Football DNA
        today), logged first-party from the click itself. This is the number a
        partner asks for and the one that justifies a sponsorship: how much
        traffic we actually send them, and what share of a page&rsquo;s readers
        click through. It is measured on our side of the link, so it keeps
        counting the ~90% of visitors who never make a cookie-consent choice
        and are invisible to Google Analytics. What it cannot see is the other
        side of the link: what those visitors did once they reached the
        partner&rsquo;s site.
        {stats.botClicks > 0 && (
          <> {stats.botClicks} click{stats.botClicks === 1 ? " was" : "s were"} excluded as bot traffic.</>
        )}
      </SectionNote>

      <SectionNote label="Why the view counts here are lower than the Page views tab">
        Views are counted over the same window as the clicks, starting when
        partner click logging went live, not over the last {stats.days} days.
        These articles have months of view history from before any click could
        be recorded, so counting all of it would divide a few clicks by
        thousands of views and call the result a click-through rate. The Page
        views tab still shows the full 30 days, so the two numbers are meant to
        differ.
      </SectionNote>

      <p style={styles.muted}>
        {stats.clampedToTrackingStart
          ? `Clicks and views both counted since ${new Date(stats.since).toLocaleString("en-GB")}, when partner click logging went live.`
          : `Clicks and views both counted over the last ${stats.days} days.`}
      </p>

      {dayOptions.length > 0 && (
        <label style={styles.compareLabel}>
          Pick a date to see that day&rsquo;s clicks by page
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.dateInput}
          >
            <option value="">All (whole window)</option>
            {dayOptions
              .slice()
              .reverse()
              .map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date} ({d.clicks} click{d.clicks === 1 ? "" : "s"})
                </option>
              ))}
          </select>
        </label>
      )}

      {stats.totalClicks === 0 ? (
        <EmptyState text="No Football DNA clicks recorded yet. Tracking went live on 22 September 2026 - before that nothing was measured, so an empty window here is not the same as no clicks." />
      ) : selectedDay ? (
        <>
          <p style={styles.sectionNote}>
            {selectedDay.date} only - {selectedDay.clicks} click
            {selectedDay.clicks === 1 ? "" : "s"}. A single day is a small
            sample; clear the date for the click-through rate, which needs the
            whole window to mean anything.
          </p>

          <h3 style={styles.affiliateHeading}>By page on {selectedDay.date}</h3>
          {selectedDay.byPage.length === 0 && <EmptyState text="No clicks on this day." />}
          {selectedDay.byPage.map((row) => (
            <div key={row.path} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{row.path}</span>
                <span style={styles.cardBadge}>{row.clicks} clicks</span>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          <div style={styles.cardStats}>
            <span>Clicks: {stats.totalClicks}</span>
            <span>Click-through rate: {overallRate === null ? "-" : pct(overallRate)}</span>
          </div>

          {stats.byPartner.length > 1 && (
            <>
              <h3 style={styles.affiliateHeading}>By partner</h3>
              {stats.byPartner.map((row) => (
                <div key={row.slug} style={styles.card}>
                  <div style={styles.cardTop}>
                    <span style={styles.cardQuery}>{row.label}</span>
                    <span style={styles.cardBadge}>{row.clicks} clicks</span>
                  </div>
                </div>
              ))}
            </>
          )}

          <h3 style={styles.affiliateHeading}>By page</h3>
          {stats.byPage.map((row) => (
            <div key={row.path} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{row.path}</span>
                <span style={styles.cardBadge}>{row.clicks} clicks</span>
              </div>
              <div style={styles.cardStats}>
                <span>Views: {row.pageViews ?? "-"}</span>
                <span>
                  Click-through rate: {row.clickRate === null ? "-" : pct(row.clickRate)}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function CookieConsentReport({ stats }: { stats: ConsentStats }) {
  const decisions = stats.acceptAll + stats.rejectAll;
  const acceptRate = decisions > 0 ? stats.acceptAll / decisions : null;
  const reachRate =
    stats.bannerShown > 0 ? stats.totalDecisions / stats.bannerShown : null;

  return (
    <div style={styles.list}>
      <SectionNote label="How to read this">
        Last 30 days. Banner shows and accept/reject/manage decisions are
        logged anonymously regardless of the choice itself, so this stays
        readable even though GA can now only see consenting visitors. If a
        GA4 pageview dip tracks the reject rate below, that&rsquo;s consent
        gating working as intended, not a traffic problem.
      </SectionNote>

      <div style={styles.cardStats}>
        <span>Shown: {stats.bannerShown}</span>
        <span>Accept: {stats.acceptAll}</span>
        <span>Reject: {stats.rejectAll}</span>
        <span>Manage &amp; save: {stats.savePreferences}</span>
      </div>
      <div style={styles.cardStats}>
        <span>Accept rate: {acceptRate === null ? "-" : pct(acceptRate)}</span>
        <span>
          Analytics granted: {pct(stats.analyticsGrantedRate)} of decisions
        </span>
        <span>
          Shown &rarr; decided: {reachRate === null ? "-" : pct(reachRate)}
        </span>
      </div>

      {stats.byDay.length === 0 ? (
        <EmptyState text="No consent events recorded yet." />
      ) : (
        stats.byDay.map((row) => (
          <div key={row.date} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={styles.cardQuery}>{row.date}</span>
              <span style={styles.cardBadge}>{row.bannerShown} shown</span>
            </div>
            <div style={styles.cardStats}>
              <span>Accept: {row.acceptAll}</span>
              <span>Reject: {row.rejectAll}</span>
              <span>Manage: {row.savePreferences}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// How many pages the top-pages list shows before you ask for more. The list
// is a leaderboard, so the long tail is normally noise - but a page you just
// visited yourself sitting one row below the cut looked like the report had
// lost it, which is why the rest is now expandable rather than gone.
const TOP_PATHS_PAGE_SIZE = 20;

function PageViewOptOutToggle() {
  // null until the effect runs: localStorage isn't readable during SSR, and
  // rendering a definite state before checking would flash the wrong one.
  const [optedOut, setOptedOut] = useState<boolean | null>(null);

  // react-hooks/set-state-in-effect wants state derived during render, but
  // localStorage isn't readable on the server and reading it in a lazy
  // initialiser would render a different tree than the one hydrated. Reading
  // once after mount is the correct pattern here, so the rule is off for
  // this line rather than the component reshaped around it.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOptedOut(isPageViewOptedOut()), []);

  if (optedOut === null) return null;

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: optedOut ? "#7bb661" : "#9c8a72",
        cursor: "pointer",
        marginTop: 8,
      }}
    >
      <input
        type="checkbox"
        checked={optedOut}
        onChange={(e) => {
          setPageViewOptOut(e.target.checked);
          setOptedOut(isPageViewOptedOut());
        }}
      />
      {optedOut
        ? "This browser is excluded from page view logging"
        : "Exclude this browser from page view logging"}
    </label>
  );
}

// The banner split test and the Coach App page views share one chosen date,
// so picking a day re-reads both. The picker sits at the very top of the tab
// so it's the first thing you set; the page views come next, and the split
// test result sits at the bottom (it's the slowest-moving number - it needs
// weeks of impressions to call - so it belongs below the day-to-day traffic).
function CoachAppTab({ stats }: { stats: CoachAppViewStats }) {
  const [selectedDate, setSelectedDate] = useState("");

  // Dates come from both sides. Coach App page views only cover the two
  // Coach App paths, while the banner test's impressions are views of the
  // articles carrying each banner, spread across the whole site - so a day
  // can have banner traffic and no Coach App landing at all, and that day
  // still has numbers worth reading.
  const viewsByDate = new Map(stats.byDay.map((d) => [d.date, d.count]));
  const dateOptions = Array.from(
    new Set([...viewsByDate.keys(), ...(stats.bannerVariants?.byDay ?? []).map((d) => d.date)])
  ).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <SectionNote label="What's included in these numbers">
        Scoped to /football-parent-coach-app (the marketing landing page) and
        /coach-app (the app itself), same page_views table as the Page views
        tab, just filtered. /coach-app is served by the rewrite in
        vercel.json to the separate Coach App deployment, which pings the
        same /api/page-view endpoint, so both sides land in one table.
      </SectionNote>

      {dateOptions.length > 0 && (
        <label style={styles.compareLabel}>
          Pick a date to see that day&rsquo;s banner test and top pages
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.dateInput}
          >
            <option value="">All (last 30 days)</option>
            {dateOptions.map((date) => (
              <option key={date} value={date}>
                {date} ({viewsByDate.get(date) ?? 0} views)
              </option>
            ))}
          </select>
        </label>
      )}

      <PageViewsReport stats={stats} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      {stats.bannerVariants && (
        <BannerVariantsReport stats={stats.bannerVariants} selectedDate={selectedDate} />
      )}
    </>
  );
}

const funnelTh: CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid #3a2c1d",
  color: "#e8b04b",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const funnelTd: CSSProperties = { padding: "6px 8px", borderBottom: "1px solid #2e2319", color: "#e9dcc5" };
const funnelNum: CSSProperties = { ...funnelTd, textAlign: "right", fontVariantNumeric: "tabular-nums" };

function FunnelHeading({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ fontSize: 13, fontWeight: 600, color: "#e8b04b", margin: "14px 0 2px" }}>{children}</h3>
  );
}

// Traffic and sign-ups per channel, side by side, plus the SEO articles and
// the share loop. Channel rules: lib/coach-app-channels.ts.
function CoachAppFunnelTab({
  funnel,
  bannerVariants,
}: {
  funnel: CoachAppFunnel;
  bannerVariants?: BannerVariantStats;
}) {
  const per100 = (signups: number, views: number) => (views > 0 ? ((signups / views) * 100).toFixed(1) : "n/a");
  const sinceLabel = new Date(funnel.since).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  const windowLabel = funnel.clampedToTrackingStart ? `since ${sinceLabel}` : `last ${funnel.days} days`;

  return (
    <div style={styles.list}>
      <SectionNote label="How channels are decided">
        Every visit to a Coach App page and every sign-up is put in one channel,
        first match wins: Google Ads (an ad click), Shared link (the link a
        parent sent from the share banner), Article banner (clicked a Coach App
        banner in an article, usually after arriving from Google), Search
        (arrived from a search engine, no banner), Site link (another page of
        ours, no banner), Direct, Other. Unknown is sign-ups only: the coach
        declined analytics cookies, so nothing about their visit was kept.
        Landing views are the Coach App page and its ad variants; sign-in views
        are the app&rsquo;s own sign-in screen. Every number on this tab
        starts when the funnel went live ({sinceLabel}), visits included, so
        visits and sign-ups cover the same period. Earlier sign-ups are only
        in the Coach App database. No sign-up row identifies a coach.
      </SectionNote>

      {funnel.signupsError && (
        <p style={styles.error}>
          Couldn&rsquo;t load sign-ups: {funnel.signupsError}. If it says the
          coach_app_signups table is missing, run
          20260925200000_coach_app_signups.sql.
        </p>
      )}

      <FunnelHeading>By channel, {windowLabel}</FunnelHeading>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
          <thead>
            <tr>
              <th style={funnelTh}>Channel</th>
              <th style={{ ...funnelTh, textAlign: "right" }}>Landing views</th>
              <th style={{ ...funnelTh, textAlign: "right" }}>Sign-in views</th>
              <th style={{ ...funnelTh, textAlign: "right" }}>Sign-ups</th>
              <th style={{ ...funnelTh, textAlign: "right" }}>Per 100 landing views</th>
            </tr>
          </thead>
          <tbody>
            {funnel.channels.map((row) => (
              <tr key={row.channel}>
                <td style={funnelTd}>{row.channel}</td>
                <td style={funnelNum}>{row.landingViews}</td>
                <td style={funnelNum}>{row.signInViews}</td>
                <td style={funnelNum}>{row.signups}</td>
                <td style={funnelNum}>{per100(row.signups, row.landingViews)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...funnelTd, fontWeight: 600 }}>Total</td>
              <td style={{ ...funnelNum, fontWeight: 600 }}>{funnel.totals.landingViews}</td>
              <td style={{ ...funnelNum, fontWeight: 600 }}>{funnel.totals.signInViews}</td>
              <td style={{ ...funnelNum, fontWeight: 600 }}>{funnel.totals.signups}</td>
              <td style={{ ...funnelNum, fontWeight: 600 }}>
                {per100(funnel.totals.signups, funnel.totals.landingViews)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={styles.sectionNote}>
        Sign-ups can come from a sign-in screen view rather than a landing view,
        so the per-100 figure is a guide, not a strict conversion rate.
      </p>

      <FunnelHeading>Sign-ups</FunnelHeading>
      {funnel.recentSignups.length === 0 ? (
        <p style={styles.muted}>No sign-ups reported {windowLabel}.</p>
      ) : (
        <>
          <p style={styles.sectionNote}>
            By day: {funnel.signupsByDay.map((d) => `${d.date}: ${d.signups}`).join(" · ")}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
              <thead>
                <tr>
                  <th style={funnelTh}>When</th>
                  <th style={funnelTh}>Channel</th>
                  <th style={funnelTh}>Signed up on</th>
                  <th style={funnelTh}>Visit began on</th>
                  <th style={funnelTh}>Banner / campaign</th>
                </tr>
              </thead>
              <tbody>
                {funnel.recentSignups.map((r, i) => (
                  <tr key={`${r.createdAt}-${i}`}>
                    <td style={funnelTd}>{new Date(r.createdAt).toLocaleString("en-GB")}</td>
                    <td style={funnelTd}>{r.channel}</td>
                    <td style={funnelTd}>{r.landingPath ?? "-"}</td>
                    <td style={funnelTd}>{r.entryPath ?? "-"}</td>
                    <td style={funnelTd}>{r.banner ?? r.utmCampaign ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <FunnelHeading>SEO: coaching articles, {windowLabel}</FunnelHeading>
      <p style={styles.sectionNote}>
        {funnel.coachingArticles.totalViews} views of /coaching/ articles,{" "}
        {funnel.coachingArticles.searchViews} from search. By source:{" "}
        {funnel.coachingArticles.bySourceGroup.map((g) => `${g.group} ${g.views}`).join(", ") || "none"}.
        Sign-ups these articles produced show above as Article banner, Search or
        Site link; the Sign-ups table names the article each visit began on.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
          <thead>
            <tr>
              <th style={funnelTh}>Article</th>
              <th style={{ ...funnelTh, textAlign: "right" }}>Views</th>
              <th style={{ ...funnelTh, textAlign: "right" }}>From search</th>
            </tr>
          </thead>
          <tbody>
            {funnel.coachingArticles.byArticle.map((a) => (
              <tr key={a.path}>
                <td style={funnelTd}>{a.path.replace("/coaching/", "")}</td>
                <td style={funnelNum}>{a.views}</td>
                <td style={funnelNum}>{a.searchViews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SharingReport stats={funnel.sharing} bannerVariants={bannerVariants} />
    </div>
  );
}

// "Send it to your child's coach": the parent-to-coach loop on the share
// banner. Taps are first-party (coach_app_shares); shared-link visits are
// page_views carrying utm_source=parent-share. Whole window only - at this
// volume a single day's share numbers are single digits.
function SharingReport({
  stats,
  bannerVariants,
}: {
  stats: CoachAppShareStats | { error: string };
  bannerVariants?: BannerVariantStats;
}) {
  const heading = (
    <h3 style={{ fontSize: 13, fontWeight: 600, color: "#e8b04b", margin: "10px 0 2px" }}>
      Sharing: parents sending the app to their child&rsquo;s coach
    </h3>
  );

  if ("error" in stats) {
    return (
      <div style={styles.list}>
        {heading}
        <p style={styles.error}>
          Couldn&rsquo;t load share stats: {stats.error}. If this says the
          coach_app_shares table is missing, the migration
          20260925180000_coach_app_shares.sql hasn&rsquo;t been applied.
        </p>
      </div>
    );
  }

  const shareRows = (bannerVariants?.rows ?? []).filter((r) => r.audience === "share");
  const impressions = shareRows.reduce((sum, r) => sum + r.impressions, 0);
  const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "n/a");

  return (
    <div style={styles.list}>
      {heading}
      <SectionNote label="How sharing is measured">
        Impressions are views of the grassroots articles carrying the share
        banner (same count as the creative test above). Taps are every press
        of &ldquo;Send it to your child&rsquo;s coach&rdquo;, logged
        first-party so cookie consent doesn&rsquo;t hide them; &ldquo;sent&rdquo;
        excludes share sheets that were opened and then dismissed. Shared-link
        visits are page views arriving with utm_source=parent-share, i.e.
        someone opening what a parent sent. Sign-ups from those visits show in
        the Coach App database as acquisition_utm_source = parent-share, not
        here. Since {new Date(stats.since).toLocaleDateString("en-GB")}.
      </SectionNote>

      <div style={styles.card}>
        <div style={styles.cardStats}>
          <span>Share banner impressions: {impressions}</span>
          <span>Taps: {stats.taps} ({pct(stats.taps, impressions)} of impressions)</span>
          <span>Sent: {stats.shares}</span>
          <span>Cancelled: {stats.cancelled}</span>
          <span>Shared-link visits: {stats.sharedLinkVisits}</span>
          <span>
            Visits per share: {stats.visitsPerShare === null ? "n/a" : stats.visitsPerShare.toFixed(2)}
          </span>
        </div>
      </div>

      {stats.taps === 0 && stats.sharedLinkVisits === 0 && (
        <p style={styles.muted}>No shares recorded yet.</p>
      )}

      {stats.byPath.length > 0 && (
        <>
          <h4 style={{ fontSize: 12, fontWeight: 600, color: "#9c8a72", margin: "8px 0 0" }}>
            Taps by article
          </h4>
          {stats.byPath.map((row) => (
            <div key={row.key} style={styles.card}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{row.key}</div>
              <div style={styles.cardStats}>
                <span>Taps: {row.count}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {stats.byMethod.length > 0 && (
        <p style={styles.sectionNote}>
          How: {stats.byMethod.map((m) => `${m.key} ${m.count}`).join(", ")}. By creative:{" "}
          {stats.byVariant.map((v) => `${v.key} ${v.count}`).join(", ")}.
        </p>
      )}

      {stats.byDay.length > 0 && (
        <p style={styles.sectionNote}>
          By day:{" "}
          {stats.byDay
            .map((d) => `${d.date}: ${d.shares} sent, ${d.cancelled} cancelled, ${d.sharedLinkVisits} visits`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

function BannerVariantsReport({
  stats,
  selectedDate,
}: {
  stats: BannerVariantStats;
  selectedDate?: string;
}) {
  const selectedDay = selectedDate ? stats.byDay.find((d) => d.date === selectedDate) ?? null : null;
  // A date with page views but no banner impression or click at all is a
  // real zero, not a missing day - fall back to an empty row set rather than
  // quietly showing the whole window's numbers under a single date heading.
  const activeRows = selectedDate ? selectedDay?.rows ?? [] : stats.rows;

  const byStyle = ["dark", "light"].map((style) => {
    const rows = activeRows.filter((r) => r.style === style);
    const clicks = rows.reduce((sum, r) => sum + r.clicks, 0);
    const impressions = rows.reduce((sum, r) => sum + r.impressions, 0);
    return {
      style,
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : 0,
    };
  });

  const [dark, light] = byStyle;
  const leader =
    dark.ctr === light.ctr ? null : dark.ctr > light.ctr ? dark : light;
  const lift =
    leader && Math.min(dark.ctr, light.ctr) > 0
      ? Math.max(dark.ctr, light.ctr) / Math.min(dark.ctr, light.ctr)
      : null;

  return (
    <div style={styles.list}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "#e8b04b", margin: "10px 0 2px" }}>
        Banner creative test{" "}
        {selectedDate ? `on ${selectedDate}` : `(since ${new Date(stats.since).toLocaleString("en-GB")})`}
      </h3>

      <SectionNote label="How the split test is measured">
        Articles are split between the two Coach App banner creatives by a
        hash of their slug, so both run at the same time. Clicks are landings
        on /football-parent-coach-app carrying that creative&rsquo;s ?b=
        param; impressions are views of the pages serving it. Compare the
        CTR column, not the click column: each arm is shown on a different
        set of articles, so raw clicks mostly reflect which arm drew the
        busier pages. Picking a date below narrows every number here to that
        one UTC day, bucketed exactly like the page view days it sits next
        to.
        {!selectedDate && stats.clampedToTestStart && (
          <>
            {" "}
            Window is pinned to when the banners went live rather than the
            last {stats.days} days, because these pages have months of traffic
            from before any banner existed and counting that as impressions
            would understate CTR badly.
          </>
        )}
      </SectionNote>

      {selectedDate && (
        <p style={styles.sectionNote}>
          One day on its own can never call the test - a day&rsquo;s worth of
          impressions is far below what a CTR gap needs to mean anything.
          Clear the date to read the result; use a single day only to see
          what actually happened on it.
        </p>
      )}

      {selectedDate && !selectedDay && (
        <p style={styles.sectionNote}>
          No banner impressions or clicks recorded on {selectedDate}.
        </p>
      )}

      {!selectedDate && !stats.enoughData && (
        <p style={styles.sectionNote}>
          Not enough data yet to call it. Both arms need at least a few
          hundred impressions before a CTR gap means anything.
        </p>
      )}

      {!selectedDate && stats.enoughData && leader && (
        <p style={styles.sectionNote}>
          Leading: the {leader.style} creative, at{" "}
          {(leader.ctr * 100).toFixed(2)}% CTR
          {lift ? ` (${lift.toFixed(2)}x the other)` : ""}.
        </p>
      )}

      {byStyle.map((row) => (
        <div
          key={row.style}
          style={{
            ...styles.card,
            borderColor: !selectedDate && leader?.style === row.style ? "#e8b04b" : "#3a2c1d",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13 }}>
            {row.style} creative, all placements
          </div>
          <div style={styles.cardStats}>
            <span>Impressions: {row.impressions}</span>
            <span>Clicks: {row.clicks}</span>
            <span>CTR: {(row.ctr * 100).toFixed(2)}%</span>
          </div>
        </div>
      ))}

      <h4 style={{ fontSize: 12, fontWeight: 600, color: "#9c8a72", margin: "8px 0 0" }}>
        Split by audience and placement
      </h4>

      {activeRows.length === 0 && (
        <p style={styles.muted}>
          No banner impressions or clicks recorded{selectedDate ? ` on ${selectedDate}` : " yet"}.
        </p>
      )}

      {activeRows.map((row) => (
        <div key={row.variant} style={styles.card}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{row.variant}</div>
          <div style={styles.cardStats}>
            <span>Impressions: {row.impressions}</span>
            <span>Clicks: {row.clicks}</span>
            <span>CTR: {(row.ctr * 100).toFixed(2)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// selectedDate/onSelectDate are optional: passed together, the parent owns
// the chosen day (the Coach App tab does this so the banner test above reads
// the same date) and renders the picker itself; omitted, this component keeps
// its own date state and its own picker, as the Page views tab needs.
function PageViewsReport({
  stats,
  selectedDate: controlledDate,
  onSelectDate,
}: {
  stats: PageViewStats;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}) {
  const daysCovered = stats.byDay.length;
  const avgPerDay = daysCovered > 0 ? Math.round(stats.totalViews / daysCovered) : 0;
  const [internalDate, setInternalDate] = useState<string>("");
  const [visiblePathCount, setVisiblePathCount] = useState(TOP_PATHS_PAGE_SIZE);
  const controlled = onSelectDate !== undefined;
  const selectedDate = controlled ? controlledDate ?? "" : internalDate;

  // Switching between a specific day and the whole window swaps the top-pages
  // list out from under the "show more" state, so every date change collapses
  // it back to the first page. Done here rather than in an effect watching
  // selectedDate: one obvious code path, no extra render.
  function selectDate(date: string) {
    if (onSelectDate) onSelectDate(date);
    else setInternalDate(date);
    setVisiblePathCount(TOP_PATHS_PAGE_SIZE);
  }

  const selectedDay = stats.byDay.find((d) => d.date === selectedDate) ?? null;
  const shownPaths = selectedDay ? selectedDay.topPaths : stats.topPaths;
  const totalPathCount = selectedDay ? selectedDay.totalPathCount : stats.totalPathCount;
  const visiblePaths = shownPaths.slice(0, visiblePathCount);
  const shownTitle = selectedDay ? `Top pages on ${selectedDay.date}` : "Top pages (last 30 days)";
  const shownSourceGroups = selectedDay ? selectedDay.sourceGroups : stats.sourceGroups;
  const shownEstimatedVisits = selectedDay ? selectedDay.estimatedVisits : stats.estimatedVisits;
  const shownInternalViews = selectedDay ? selectedDay.internalViews : stats.internalViews;
  const shownBotViews = selectedDay ? selectedDay.botViews : stats.botViews;
  const sourceGroupsTitle = selectedDay
    ? `Traffic sources on ${selectedDay.date}`
    : `Traffic sources (last ${daysCovered} days, excludes on-site navigation)`;

  return (
    <div style={styles.list}>
      <SectionNote label="What counts as a view">
        Last 30 days, excluding /admin/* (that&rsquo;s you checking the
        dashboard, not a visitor). Fires on every page load regardless of
        cookie consent or whether the banner has ever been shown to that
        visitor - unlike the Cookie consent tab, a returning visitor who
        already accepted or rejected still counts here. This is the number
        to check against GA sessions: if GA is well below this, that gap is
        consent-mode visibility; if this number is also low, traffic
        genuinely dropped. Self-declared bots/crawlers and known scripted
        spikes are excluded from every number below - see &ldquo;Bot views
        excluded&rdquo;. Top pages is a leaderboard: a page you visited
        yourself is often a single view well down that list, so use the Page
        trend tab to check one specific page rather than hunting for it here.
      </SectionNote>

      <div style={styles.cardStats}>
        <span>Total views: {stats.totalViews}</span>
        <span>Average per day: {avgPerDay}</span>
        <span>Bot views excluded: {shownBotViews}</span>
      </div>

      {stats.sourceGroups.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#e8b04b", margin: "10px 0 2px" }}>
            {sourceGroupsTitle}
          </h3>
          <SectionNote label="How sources are worked out">
            Based on the referrer header, not a cookie - unaffected by
            consent choice. &ldquo;Direct&rdquo; is a mix of genuine direct/
            bookmark visits and any case where the browser or an in-app
            browser (Instagram, TikTok) blocked the referrer, so it will
            run higher than the true number. Bing search and Bing/Copilot
            chat share a hostname and can&rsquo;t be told apart; same for
            Grok and X/Twitter.
          </SectionNote>
          <div style={styles.cardStats}>
            <span>Estimated visits: {shownEstimatedVisits}</span>
            <span>Internal (browsed to another page): {shownInternalViews}</span>
          </div>
          <SectionNote label="Estimated visits vs internal">
            Estimated visits counts pageviews where the referrer wasn&rsquo;t
            this site itself - only a visit&rsquo;s first page qualifies,
            since every later page in the same visit is reached by clicking
            a link on the site. Internal is the rest: pageviews reached by
            clicking through from another page here, i.e. people who kept
            browsing rather than bouncing after the first page. The two
            always add up to that period&rsquo;s total pageviews (shown per
            day in the picker below). Not exact - a browser that strips the
            referrer mid-visit, or two tabs opened from the same link, can
            inflate Estimated visits slightly.
          </SectionNote>
          {shownSourceGroups.length === 0 && (
            <EmptyState text="No external-referrer traffic on this date - everything was Direct or on-site navigation." />
          )}
          {shownSourceGroups.map((g) => (
            <div key={g.group} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{g.group}</span>
                <span style={styles.cardBadge}>{g.count}</span>
              </div>
              <div style={styles.cardStats}>
                {g.topSources.map((s) => (
                  <span key={s.label}>
                    {s.label}: {s.count}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {stats.byDay.length > 0 && !controlled && (
        <label style={styles.compareLabel}>
          Pick a date to see its top pages
          <select
            value={selectedDate}
            onChange={(e) => selectDate(e.target.value)}
            style={styles.dateInput}
          >
            <option value="">All (last 30 days)</option>
            {stats.byDay.map((d) => (
              <option key={d.date} value={d.date}>
                {d.date} ({d.count} views)
              </option>
            ))}
          </select>
        </label>
      )}

      {stats.byDay.length === 0 ? (
        <EmptyState text="No page views recorded yet." />
      ) : (
        stats.byDay.map((row) => (
          <div
            key={row.date}
            style={{ ...styles.card, cursor: "pointer" }}
            onClick={() => selectDate(row.date === selectedDate ? "" : row.date)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectDate(row.date === selectedDate ? "" : row.date);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div style={styles.cardTop}>
              <span
                style={{
                  ...styles.cardQuery,
                  ...(row.date === selectedDate ? { color: "#e8b04b" } : {}),
                }}
              >
                {row.date}
              </span>
              <span style={styles.cardBadge}>{row.count} views</span>
            </div>
          </div>
        ))
      )}

      {shownPaths.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#e8b04b", margin: "10px 0 2px" }}>
            {shownTitle}
          </h3>
          <p style={{ ...styles.sectionNote, marginTop: 0 }}>
            Showing {visiblePaths.length} of {totalPathCount} page
            {totalPathCount === 1 ? "" : "s"} with at least one view
            {totalPathCount > shownPaths.length
              ? ` (this list is capped at ${shownPaths.length})`
              : ""}
            .
          </p>
          {visiblePaths.map((p, i) => (
            <div key={i} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{p.path}</span>
                <span style={styles.cardBadge}>{p.count}x</span>
              </div>
            </div>
          ))}
          {(visiblePathCount < shownPaths.length || visiblePathCount > TOP_PATHS_PAGE_SIZE) && (
            <div style={styles.metricToggle}>
              {visiblePathCount < shownPaths.length && (
                <button
                  type="button"
                  onClick={() =>
                    setVisiblePathCount((n) => Math.min(n + TOP_PATHS_PAGE_SIZE, shownPaths.length))
                  }
                  style={styles.toggleButton}
                >
                  Show {Math.min(TOP_PATHS_PAGE_SIZE, shownPaths.length - visiblePathCount)} more
                </button>
              )}
              {visiblePathCount < shownPaths.length && (
                <button
                  type="button"
                  onClick={() => setVisiblePathCount(shownPaths.length)}
                  style={styles.toggleButton}
                >
                  Show all {shownPaths.length}
                </button>
              )}
              {visiblePathCount > TOP_PATHS_PAGE_SIZE && (
                <button
                  type="button"
                  onClick={() => setVisiblePathCount(TOP_PATHS_PAGE_SIZE)}
                  style={styles.toggleButton}
                >
                  Show fewer
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

function deltaStyle(delta: number): CSSProperties {
  if (delta > 0) return { color: "#8fd19e" };
  if (delta < 0) return { color: "#e07856" };
  return { color: "#9c8a72" };
}

type PageViewCompareDirection = "gains" | "losses";

// Defaults to yesterday vs the day before - unlike the GSC CompareDays tab
// below, page_views has no processing lag to work around, so "yesterday" is
// safe as a default here.
function ComparePageViews() {
  const [dateA, setDateA] = useState(daysAgo(1));
  const [dateB, setDateB] = useState(daysAgo(2));
  const [result, setResult] = useState<PageViewDayComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [direction, setDirection] = useState<PageViewCompareDirection>("losses");
  const hasRun = useRef(false);

  function runCompare(a: string, b: string) {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ dateA: a, dateB: b });
    fetch(`/api/page-view-compare?${qs.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load comparison");
        }
        return res.json();
      })
      .then((data: PageViewDayComparison) => setResult(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load comparison"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runCompare(dateA, dateB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedPages = result
    ? [...result.pages]
        .filter((p) => p.delta !== 0)
        .sort((p1, p2) => (direction === "gains" ? p2.delta - p1.delta : p1.delta - p2.delta))
    : [];

  return (
    <div style={styles.list}>
      <SectionNote label="What this compares">
        Same page_views data as the Page views tab above (bot rows already
        excluded), broken down by page for two specific days so you can see
        exactly which pages gained or lost views day over day. Defaults to
        yesterday vs the day before - pick any two dates and hit Compare.
      </SectionNote>

      <div style={styles.compareRow}>
        <label style={styles.compareLabel}>
          Day A
          <input
            type="date"
            value={dateA}
            onChange={(e) => setDateA(e.target.value)}
            style={styles.dateInput}
          />
        </label>
        <label style={styles.compareLabel}>
          Day B
          <input
            type="date"
            value={dateB}
            onChange={(e) => setDateB(e.target.value)}
            style={styles.dateInput}
          />
        </label>
        <button
          type="button"
          onClick={() => runCompare(dateA, dateB)}
          disabled={loading}
          style={{ ...styles.toggleButton, ...styles.toggleButtonActive }}
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {result && (
        <>
          <div style={styles.cardStats}>
            <span>
              {result.dateA}: {result.totalA} views
            </span>
            <span>
              {result.dateB}: {result.totalB} views
            </span>
            <span style={deltaStyle(result.totalDelta)}>
              {result.totalDelta >= 0 ? "+" : ""}
              {result.totalDelta}
            </span>
          </div>

          <div style={styles.metricToggle}>
            {(["gains", "losses"] as PageViewCompareDirection[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                style={{ ...styles.toggleButton, ...(direction === d ? styles.toggleButtonActive : {}) }}
              >
                {d === "gains" ? "Gains" : "Losses"}
              </button>
            ))}
          </div>

          {sortedPages.length === 0 ? (
            <EmptyState text="No page-level differences between these two days." />
          ) : (
            sortedPages.map((p) => (
              <div key={p.path} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.cardQuery}>{p.path}</span>
                  <span style={{ ...styles.cardBadge, ...deltaStyle(p.delta) }}>
                    {p.delta >= 0 ? "+" : ""}
                    {p.delta}
                  </span>
                </div>
                <div style={styles.cardStats}>
                  <span>
                    {result.dateA}: {p.countA}
                  </span>
                  <span>
                    {result.dateB}: {p.countB}
                  </span>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

interface PageViewByPathResponse {
  path: string;
  byDay: PageViewDailyCount[];
  sources: SourceGroupCount[];
  userAgents: PathSourceUserAgent[];
  botViews: number;
  totalViews: number;
}

type TrendWindow = "7" | "30" | "all";

const MAX_SUGGESTIONS = 20;

// Suggestions are every page on the site (sitemap route list) merged with any
// path seen in page_views - not just the top 50 by recent views, which is what
// previously hid perfectly real pages from this search. Typing a full path that
// is in neither list and pressing Enter still works.
function PageViewTrend({ observedPaths }: { observedPaths: string[] }) {
  const pathOptions = allPagePaths(observedPaths);
  const [query, setQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [result, setResult] = useState<PageViewByPathResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [windowFilter, setWindowFilter] = useState<TrendWindow>("all");

  const matchCount = query.trim().length > 0 ? pathOptions.filter((p) => matchesPageSearch(p, query)).length : 0;
  const suggestions = query.trim().length > 0 ? searchPaths(pathOptions, query, MAX_SUGGESTIONS) : [];

  function runLookup(p: string) {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ path: p });
    fetch(`/api/page-view-by-path?${qs.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load page trend");
        }
        return res.json();
      })
      .then((data: PageViewByPathResponse) => setResult(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load page trend"))
      .finally(() => setLoading(false));
  }

  // Fetch is triggered directly from selection (click a suggestion, or
  // Enter) rather than from an effect watching selectedPath - avoids an
  // effect-driven fetch and keeps "pick it and it loads immediately" a
  // single, obvious code path.
  function selectPath(p: string) {
    setQuery(p);
    setSelectedPath(p);
    setSuggestionsOpen(false);
    runLookup(p);
  }

  function clearSelection() {
    setQuery("");
    setSelectedPath("");
    setResult(null);
    setError("");
    setSuggestionsOpen(false);
  }

  const windowedByDay = result
    ? windowFilter === "all"
      ? result.byDay
      : result.byDay.slice(-Number(windowFilter))
    : [];
  const total = windowedByDay.reduce((sum, d) => sum + d.count, 0);
  const avg = windowedByDay.length > 0 ? Math.round((total / windowedByDay.length) * 10) / 10 : 0;
  const maxCount = Math.max(1, ...windowedByDay.map((d) => d.count));

  return (
    <div style={styles.list}>
      <SectionNote label="How the search and history work">
        Same page_views data as the Page views tab above (bot rows already
        excluded). Every page on the site is searchable here, whether or not
        it has any views yet - type any word from the URL (&ldquo;parent
        mistake&rdquo; finds /parent-guides/biggest-football-parent-mistakes)
        and pick it from the list to see its daily view count, including days
        with zero views. Defaults to
        the page&rsquo;s full history, starting from its first recorded page
        view - not its actual publish date, since view tracking only began
        2026-08-19. A page published before then will show a gap: its real
        history runs further back than this can show.
      </SectionNote>

      <div style={styles.compareRow}>
        <label style={{ ...styles.compareLabel, position: "relative" }}>
          Page
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestionsOpen(true);
              if (selectedPath && e.target.value !== selectedPath) {
                setSelectedPath("");
                setResult(null);
              }
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setSuggestionsOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (suggestions.length > 0) selectPath(suggestions[0]);
                else if (query.trim()) selectPath(query.trim());
              } else if (e.key === "Escape") {
                setSuggestionsOpen(false);
              }
            }}
            placeholder="Search e.g. veo, boots, academy..."
            style={styles.pathInput}
          />
          {suggestionsOpen && query.trim().length > 0 && (
            <div style={styles.suggestionList}>
              {suggestions.map((p) => (
                <div
                  key={p}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPath(p)}
                  style={styles.suggestionItem}
                >
                  {p}
                </div>
              ))}
              {suggestions.length === 0 && (
                <div style={styles.suggestionEmpty}>
                  No page on the site matches &ldquo;{query.trim()}&rdquo;. Press Enter to look
                  up what you typed as an exact path anyway.
                </div>
              )}
              {matchCount > suggestions.length && (
                <div style={styles.suggestionEmpty}>
                  +{matchCount - suggestions.length} more - keep typing to narrow it down.
                </div>
              )}
            </div>
          )}
        </label>
        {(query || selectedPath) && (
          <button type="button" onClick={clearSelection} style={styles.toggleButton}>
            Clear
          </button>
        )}
      </div>

      {loading && <p style={styles.muted}>Loading...</p>}
      {error && <p style={styles.error}>{error}</p>}

      {!selectedPath && !loading && (
        <EmptyState text="Search for a page above and pick it from the list." />
      )}

      {result && (
        <>
          <div style={styles.metricToggle}>
            {(["7", "30", "all"] as TrendWindow[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindowFilter(w)}
                style={{ ...styles.toggleButton, ...(windowFilter === w ? styles.toggleButtonActive : {}) }}
              >
                {w === "all" ? "Full history" : `${w} days`}
              </button>
            ))}
          </div>

          <div style={styles.cardStats}>
            <span>{result.path}</span>
            <span>Total: {total}</span>
            <span>Average per day: {avg}</span>
          </div>

          {windowedByDay.every((d) => d.count === 0) && (
            <EmptyState
              text={
                result.byDay.some((d) => d.count > 0)
                  ? "No views recorded for this page in this window."
                  : "No page views have ever been recorded for this path. That is a real answer, not a broken search: the page exists, it just has no tracked visits (check the path if you expected some, and remember view tracking only started 2026-08-19)."
              }
            />
          )}

          {windowedByDay.map((d) => (
            <div key={d.date} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardQuery}>{d.date}</span>
                <span style={styles.cardBadge}>{d.count}</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width: `${(d.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}

          <PathSourceBreakdown result={result} />
        </>
      )}
    </div>
  );
}

// Where one page's views came from, and what was behind them. Sits under the
// trend chart on the Page trend tab.
//
// Exists because the aggregate source split on the Page views tab is per day
// across the whole site, so answering "where did the traffic to this one page
// come from" meant querying Supabase by hand. On 9 September that hand query
// is what showed 25 views of a mistyped URL were one client rotating user
// agents inside 34 seconds, not 25 readers.
function PathSourceBreakdown({ result }: { result: PageViewByPathResponse }) {
  const [showUserAgents, setShowUserAgents] = useState(false);

  if (result.totalViews === 0 && result.botViews === 0) return null;

  return (
    <>
      <h3 style={styles.affiliateHeading}>Where this page&rsquo;s views came from</h3>

      <SectionNote label="What this covers, and what it can't tell you">
        This page&rsquo;s full recorded history, not the 7/30-day window
        selected above, so these totals will be higher than the chart when a
        shorter window is picked. Source comes from the referrer host only:
        no full URLs, so it names the site a visit came from, never the
        specific page or post. &ldquo;Direct&rdquo; is a mix of genuine
        direct visits and every case where the referrer was stripped, which
        in-app browsers and most AI tools do routinely, so it is never
        proof of anything on its own.
        {result.botViews > 0 && (
          <> {result.botViews} row{result.botViews === 1 ? " was" : "s were"} excluded
          as bot traffic and {result.botViews === 1 ? "is" : "are"} not counted below.</>
        )}
      </SectionNote>

      {result.sources.length === 0 ? (
        <EmptyState text="No sources recorded for this page." />
      ) : (
        result.sources.map((group) => (
          <div key={group.group} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={styles.cardQuery}>{group.group}</span>
              <span style={styles.cardBadge}>{group.count}</span>
            </div>
            <div style={styles.cardStats}>
              {group.topSources.map((src) => (
                <span key={src.label}>
                  {src.label}: {src.count}
                </span>
              ))}
            </div>
          </div>
        ))
      )}

      {result.userAgents.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowUserAgents((v) => !v)}
            style={styles.toggleButton}
          >
            {showUserAgents ? "Hide" : "Show"} user agents ({result.userAgents.length})
          </button>

          {showUserAgents && (
            <>
              <SectionNote label="How to read the user agent list">
                Raw strings, busiest first, with the first and last time each
                was seen. Two shapes are worth looking for. One string
                repeating dozens of times on a single page is a script rather
                than a reader. Several different browser versions arriving
                within seconds of each other is one client rotating its user
                agent, which is the same thing wearing a disguise. A widely
                shared, current browser string on a busy page is just normal
                traffic.
              </SectionNote>

              {result.userAgents.map((ua) => (
                <div key={ua.userAgent} style={styles.card}>
                  <div style={styles.cardTop}>
                    <span style={{ ...styles.cardQuery, wordBreak: "break-all" }}>
                      {ua.userAgent}
                    </span>
                    <span style={styles.cardBadge}>{ua.hits}</span>
                  </div>
                  <div style={styles.cardStats}>
                    <span>First: {new Date(ua.firstSeen).toLocaleString("en-GB")}</span>
                    <span>Last: {new Date(ua.lastSeen).toLocaleString("en-GB")}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

type CompareAxis = "pages" | "terms";
type CompareDirection = "gains" | "losses";

// "4 days ago" keeps Day A safely clear of GSC's ~3-day processing lag by
// default - see freshnessWarning() in lib/gsc.ts, which also flags this
// directly in the response if the user picks a more recent date anyway.
function CompareDays() {
  const [dateA, setDateA] = useState(daysAgo(4));
  const [dateB, setDateB] = useState(daysAgo(11));
  const [result, setResult] = useState<PeriodComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [axis, setAxis] = useState<CompareAxis>("pages");
  const [direction, setDirection] = useState<CompareDirection>("losses");
  const hasRun = useRef(false);

  function runCompare(a: string, b: string) {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ startA: a, endA: a, startB: b, endB: b });
    fetch(`/api/compare-report?${qs.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load comparison");
        }
        return res.json();
      })
      .then((data: PeriodComparison) => setResult(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load comparison"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runCompare(dateA, dateB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.list}>
      <SectionNote label="How to use this">
        Pick the day you noticed the spike (Day A) and a day to compare it
        against (Day B - defaults to the same weekday a week earlier). Shows
        site-wide totals for each day, then the specific pages and search
        queries that account for the biggest gains and drops between them.
      </SectionNote>

      <div style={styles.compareRow}>
        <label style={styles.compareLabel}>
          Day A
          <input
            type="date"
            value={dateA}
            onChange={(e) => setDateA(e.target.value)}
            style={styles.dateInput}
          />
        </label>
        <label style={styles.compareLabel}>
          Day B
          <input
            type="date"
            value={dateB}
            onChange={(e) => setDateB(e.target.value)}
            style={styles.dateInput}
          />
        </label>
        <button
          type="button"
          onClick={() => runCompare(dateA, dateB)}
          disabled={loading}
          style={{ ...styles.toggleButton, ...styles.toggleButtonActive }}
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {result && (
        <>
          {result.dataFreshnessWarning && (
            <p style={{ ...styles.sectionNote, color: "#e07856" }}>
              {result.dataFreshnessWarning}
            </p>
          )}

          <div style={styles.cardStats}>
            <span>
              {result.periodA.start}: {result.periodA.clicks} clicks,{" "}
              {result.periodA.impressions} impressions, avg pos {result.periodA.avgPosition ?? "-"}
            </span>
          </div>
          <div style={styles.cardStats}>
            <span>
              {result.periodB.start}: {result.periodB.clicks} clicks,{" "}
              {result.periodB.impressions} impressions, avg pos {result.periodB.avgPosition ?? "-"}
            </span>
          </div>
          <div style={styles.cardStats}>
            <span style={deltaStyle(result.totalClicksDelta)}>
              {result.totalClicksDelta >= 0 ? "+" : ""}
              {result.totalClicksDelta} clicks
            </span>
            <span style={deltaStyle(result.totalImpressionsDelta)}>
              {result.totalImpressionsDelta >= 0 ? "+" : ""}
              {result.totalImpressionsDelta} impressions
            </span>
          </div>

          <div style={styles.compareRow}>
            <div style={styles.metricToggle}>
              {(["pages", "terms"] as CompareAxis[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAxis(a)}
                  style={{ ...styles.toggleButton, ...(axis === a ? styles.toggleButtonActive : {}) }}
                >
                  {a === "pages" ? "Pages" : "Terms"}
                </button>
              ))}
            </div>
            <div style={styles.metricToggle}>
              {(["gains", "losses"] as CompareDirection[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  style={{ ...styles.toggleButton, ...(direction === d ? styles.toggleButtonActive : {}) }}
                >
                  {d === "gains" ? "Gains" : "Losses"}
                </button>
              ))}
            </div>
          </div>

          <CompareMoverList result={result} axis={axis} direction={direction} />
        </>
      )}
    </div>
  );
}

function pageQueryDirectionLabel(q: PageQueryMover): string {
  switch (q.direction) {
    case "up":
      return `up ${q.positionDelta}`;
    case "down":
      return `down ${Math.abs(q.positionDelta ?? 0)}`;
    case "new":
      return "new in period A";
    case "lost":
      return "no longer ranking in period A";
    default:
      return "no change";
  }
}

function PageQueryDrilldown({
  page,
  periodA,
  periodB,
}: {
  page: string;
  periodA: PeriodTotals;
  periodB: PeriodTotals;
}) {
  const [queries, setQueries] = useState<PageQueryMover[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const hasRun = useRef(false);

  function loadQueries() {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({
      page,
      startA: periodA.start,
      endA: periodA.end,
      startB: periodB.start,
      endB: periodB.end,
    });
    fetch(`/api/compare-page-queries?${qs.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load page queries");
        }
        return res.json();
      })
      .then((data: { queries: PageQueryMover[] }) => setQueries(data.queries))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load page queries"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    // The parent keys this component by page+period, so a different page
    // or a re-run comparison remounts a fresh instance (and a fresh
    // hasRun) rather than updating these props in place.
    loadQueries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.drilldown}>
      {loading && <p style={styles.muted}>Loading terms...</p>}
      {error && <p style={styles.error}>{error}</p>}
      {queries && queries.length === 0 && (
        <EmptyState text="No queries recorded for this page in either period." />
      )}
      {queries &&
        queries.map((q, i) => (
          <div key={i} style={styles.cannibalRow}>
            <span style={{ ...styles.cardPage, ...directionStyle(q.direction) }}>{q.query}</span>
            <span style={styles.cardStatsInline}>
              {q.positionA !== null ? `#${q.positionA}` : "-"} (was {q.positionB !== null ? `#${q.positionB}` : "-"}
              , {pageQueryDirectionLabel(q)}) - {q.impressionsA} impr (was {q.impressionsB})
            </span>
          </div>
        ))}
    </div>
  );
}

function CompareMoverList({
  result,
  axis,
  direction,
}: {
  result: PeriodComparison;
  axis: CompareAxis;
  direction: CompareDirection;
}) {
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  const rows =
    axis === "pages"
      ? direction === "gains"
        ? result.topPageGains
        : result.topPageDrops
      : direction === "gains"
        ? result.topQueryGains
        : result.topQueryDrops;

  if (!rows.length) {
    return (
      <EmptyState
        text={`No ${axis === "pages" ? "page" : "term"} ${direction} cleared the noise threshold between these two days.`}
      />
    );
  }

  return (
    <div style={styles.list}>
      {axis === "pages" && (
        <p style={styles.sectionNote}>Click a page to see every term behind it, and which moved up, down, or dropped off.</p>
      )}
      {rows.slice(0, 25).map((r, i) => {
        const isPageRow = axis === "pages";
        const isSelected = isPageRow && selectedPage === r.key;
        return (
          <div key={i}>
            <div
              style={{ ...styles.card, ...(isPageRow ? { cursor: "pointer" } : {}) }}
              onClick={isPageRow ? () => setSelectedPage(isSelected ? null : r.key) : undefined}
              onKeyDown={
                isPageRow
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPage(isSelected ? null : r.key);
                      }
                    }
                  : undefined
              }
              role={isPageRow ? "button" : undefined}
              tabIndex={isPageRow ? 0 : undefined}
            >
              <div style={styles.cardTop}>
                <span style={{ ...styles.cardQuery, ...(isSelected ? { color: "#e8b04b" } : {}) }}>
                  {axis === "pages" ? shortPage(r.key) : r.key}
                </span>
                <span style={{ ...styles.cardBadge, ...deltaStyle(r.delta) }}>
                  {r.delta >= 0 ? "+" : ""}
                  {r.delta} impr
                </span>
              </div>
              <div style={styles.cardStats}>
                <span>
                  clicks: {r.clicksA} (was {r.clicksB})
                </span>
                <span>
                  pos: {r.positionA ?? "-"} (was {r.positionB ?? "-"})
                </span>
              </div>
            </div>
            {isSelected && (
              <PageQueryDrilldown
                key={`${r.key}|${result.periodA.start}|${result.periodA.end}|${result.periodB.start}|${result.periodB.end}`}
                page={r.key}
                periodA={result.periodA}
                periodB={result.periodB}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#1a1410",
    color: "#f0e6d2",
    fontFamily: "system-ui, sans-serif",
    paddingBottom: 40,
  },
  header: {
    padding: "20px 16px 12px",
    borderBottom: "1px solid #3a2c1d",
  },
  title: {
    margin: 0,
    fontSize: 19,
    color: "#e8b04b",
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  // Same button as the "SEO dashboard" link on /admin/outreach.
  navLink: {
    color: "#c9b896",
    fontSize: 13,
    textDecoration: "none",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: "8px 12px",
    whiteSpace: "nowrap",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#9c8a72",
  },
  tabBar: {
    display: "flex",
    overflowX: "auto",
    gap: 8,
    padding: "12px 16px",
    borderBottom: "1px solid #3a2c1d",
  },
  tabButton: {
    flex: "0 0 auto",
    background: "#241b14",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#3a2c1d",
    borderRadius: 999,
    padding: "8px 14px",
    color: "#c9b896",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabButtonActive: {
    background: "#e8b04b",
    color: "#1a1410",
    borderColor: "#e8b04b",
    fontWeight: 600,
  },
  tabCount: {
    fontSize: 11,
    opacity: 0.8,
  },
  content: {
    padding: "16px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  card: {
    background: "#241b14",
    border: "1px solid #3a2c1d",
    borderRadius: 10,
    padding: 12,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardQuery: {
    fontSize: 14,
    fontWeight: 600,
    color: "#f0e6d2",
  },
  cardBadge: {
    fontSize: 12,
    background: "#3a2c1d",
    color: "#e8b04b",
    borderRadius: 6,
    padding: "2px 6px",
    flexShrink: 0,
  },
  affiliateHeading: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e8b04b",
    margin: "10px 0 2px",
  },
  cardBadgeWarn: {
    color: "#e07856",
  },
  cardPage: {
    margin: "4px 0",
    fontSize: 12,
    color: "#9c8a72",
    wordBreak: "break-all",
  },
  cardStats: {
    display: "flex",
    gap: 12,
    fontSize: 12,
    color: "#c9b896",
    marginTop: 4,
    flexWrap: "wrap",
  },
  cardStatsInline: {
    fontSize: 12,
    color: "#9c8a72",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
  },
  summaryTileButton: {
    textAlign: "left",
    cursor: "pointer",
    width: "100%",
    font: "inherit",
  },
  summaryTileButtonActive: {
    borderColor: "#e8b04b",
    background: "#2e2313",
  },
  cannibalRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    padding: "6px 0",
    borderTop: "1px solid #3a2c1d",
  },
  drilldown: {
    background: "#1f170f",
    border: "1px solid #3a2c1d",
    borderTop: "none",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: "0 12px 8px",
    marginTop: -10,
  },
  muted: {
    color: "#9c8a72",
    fontSize: 14,
  },
  sectionNote: {
    color: "#9c8a72",
    fontSize: 12,
    margin: "0 0 4px",
    lineHeight: 1.5,
  },
  metricToggle: {
    display: "flex",
    gap: 6,
    marginBottom: 4,
  },
  toggleButton: {
    background: "#241b14",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#3a2c1d",
    borderRadius: 999,
    padding: "4px 10px",
    color: "#c9b896",
    fontSize: 12,
    cursor: "pointer",
  },
  toggleButtonActive: {
    background: "#e8b04b",
    color: "#1a1410",
    borderColor: "#e8b04b",
    fontWeight: 600,
  },
  error: {
    color: "#e07856",
    fontSize: 14,
  },
  compareRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 4,
  },
  compareLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 12,
    color: "#9c8a72",
  },
  dateInput: {
    background: "#241b14",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: "6px 8px",
    color: "#f0e6d2",
    fontSize: 13,
  },
  pathInput: {
    background: "#241b14",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: "6px 8px",
    color: "#f0e6d2",
    fontSize: 13,
    minWidth: 320,
  },
  suggestionList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 10,
    marginTop: 2,
    background: "#241b14",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    maxHeight: 260,
    overflowY: "auto",
  },
  suggestionItem: {
    padding: "8px 10px",
    fontSize: 13,
    color: "#f0e6d2",
    cursor: "pointer",
    borderBottom: "1px solid #3a2c1d",
  },
  noteDetails: {
    background: "#2a1f14",
    border: "1px solid #3a2c1d",
    borderRadius: 6,
    padding: "6px 10px",
    margin: "8px 0",
  },
  noteSummary: {
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: "#b8a68c",
    listStyle: "revert",
  },
  suggestionTag: {
    marginLeft: 8,
    fontSize: 11,
    color: "#b8a68c",
  },
  suggestionEmpty: {
    padding: "8px 10px",
    fontSize: 12,
    color: "#b8a68c",
    borderBottom: "1px solid #3a2c1d",
  },
  barTrack: {
    background: "#3a2c1d",
    borderRadius: 4,
    height: 6,
    marginTop: 8,
    overflow: "hidden",
  },
  barFill: {
    background: "#e8b04b",
    height: "100%",
    borderRadius: 4,
  },
};
