"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  SeoReport,
  StrikingRow,
  LowCtrRow,
  DecayRow,
  CannibalRow,
  SilenceRow,
  RankRow,
  NoImpressionsRow,
} from "@/lib/gsc";
import type { SearchLogStats } from "@/lib/supabase/search-log"; // type-only import, erased at build time - safe from a client component
import type { ConsentStats } from "@/lib/supabase/cookie-consent"; // type-only import, erased at build time - safe from a client component
import type { PeriodComparison } from "@/lib/gsc";

type Tab =
  | "silence"
  | "noImpressions"
  | "striking"
  | "ctr"
  | "decay"
  | "cannibal"
  | "rank"
  | "searches"
  | "cookies"
  | "compare";
type DayWindow = 7 | 28 | 90;

const TABS: { id: Tab; label: string }[] = [
  { id: "silence", label: "Gone quiet" },
  { id: "noImpressions", label: "No impressions" },
  { id: "striking", label: "Striking distance" },
  { id: "ctr", label: "Low CTR" },
  { id: "decay", label: "Decay" },
  { id: "cannibal", label: "Cannibalisation" },
  { id: "rank", label: "Rank tracker" },
  { id: "searches", label: "Top searches" },
  { id: "cookies", label: "Cookie consent" },
  { id: "compare", label: "Compare days" },
];

function shortPage(page: string): string {
  try {
    const u = new URL(page);
    return u.pathname === "/" ? "/" : u.pathname;
  } catch {
    return page;
  }
}

export default function SeoAdminPage() {
  const [report, setReport] = useState<SeoReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("silence");
  const [strikingDays, setStrikingDays] = useState<DayWindow>(90);
  const [ctrDays, setCtrDays] = useState<DayWindow>(90);
  const [noImpressionsDays, setNoImpressionsDays] = useState<DayWindow>(90);
  const [searchStats, setSearchStats] = useState<SearchLogStats | null>(null);
  const [searchError, setSearchError] = useState("");
  const [consentStats, setConsentStats] = useState<ConsentStats | null>(null);
  const [consentError, setConsentError] = useState("");
  const isFirstFetch = useRef(true);

  useEffect(() => {
    fetch("/api/search-report?days=30")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load search report");
        }
        return res.json();
      })
      .then((data: SearchLogStats) => {
        setSearchStats(data);
        setSearchError("");
      })
      .catch((err) => setSearchError(err.message));
  }, []);

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
        <h1 style={styles.title}>SEO optimisation report</h1>
        {report && (
          <p style={styles.subtitle}>
            {report.periodStart} to {report.periodEnd}
            {refreshing && " - updating..."}
          </p>
        )}
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
            {t.id !== "searches" && t.id !== "cookies" && t.id !== "compare" && report && (
              <span style={styles.tabCount}>{countFor(report, t.id)}</span>
            )}
          </button>
        ))}
      </nav>

      <main style={styles.content}>
        {tab === "searches" ? (
          <>
            {!searchStats && !searchError && <p style={styles.muted}>Loading search report...</p>}
            {searchError && <p style={styles.error}>{searchError}</p>}
            {searchStats && <SearchesList stats={searchStats} />}
          </>
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
                {tab === "rank" && <RankTrackerList rows={report.rankTracker} />}
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
      return report.rankTracker.length;
    case "searches":
      return 0;
    case "cookies":
      return 0;
    case "compare":
      return 0;
  }
}

function PeriodFilter({ value, onChange }: { value: DayWindow; onChange: (days: DayWindow) => void }) {
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
      <p style={styles.sectionNote}>
        Real prior traffic, near-zero in the recent window. Usually technical
        (deindexing, noindex, canonical, a bad deploy), not a content issue.
        Check URL Inspection / Test Live URL before editing anything.
      </p>
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

function StrikingList({
  rows,
  days,
  onDaysChange,
}: {
  rows: StrikingRow[];
  days: DayWindow;
  onDaysChange: (d: DayWindow) => void;
}) {
  return (
    <div style={styles.list}>
      <PeriodFilter value={days} onChange={onDaysChange} />
      {!rows.length && <EmptyState text="Nothing on page 2 right now." />}
      {rows.slice(0, 60).map((r, i) => (
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
      <p style={styles.sectionNote}>
        Every sitemap URL with zero impressions in this window - pages that
        have either stopped ranking entirely or never picked up any search
        visibility. Candidates for a rewrite, not just a tweak.
      </p>
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

type DirectionFilter = "all" | "improved" | "lost";

function matchesDirectionFilter(direction: RankRow["direction"], filter: DirectionFilter): boolean {
  if (filter === "improved") return direction === "up" || direction === "new";
  if (filter === "lost") return direction === "down" || direction === "lost";
  return true;
}

type RankSortMetric = "position" | "impressions" | "clicks";

function RankTrackerList({ rows }: { rows: RankRow[] }) {
  const [metric, setMetric] = useState<RankSortMetric>("impressions");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");

  if (!rows.length) {
    return <EmptyState text="Not enough recent search volume yet to track keyword movement." />;
  }

  const visible = rows
    .filter((r) => matchesDirectionFilter(r.direction, directionFilter))
    .sort((a, b) => {
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
      <div style={styles.metricToggle}>
        <button
          onClick={() => setDirectionFilter("all")}
          style={{ ...styles.toggleButton, ...(directionFilter === "all" ? styles.toggleButtonActive : {}) }}
        >
          All
        </button>
        <button
          onClick={() => setDirectionFilter("improved")}
          style={{ ...styles.toggleButton, ...(directionFilter === "improved" ? styles.toggleButtonActive : {}) }}
        >
          Improved
        </button>
        <button
          onClick={() => setDirectionFilter("lost")}
          style={{ ...styles.toggleButton, ...(directionFilter === "lost" ? styles.toggleButtonActive : {}) }}
        >
          Lost
        </button>
      </div>
      <p style={styles.sectionNote}>
        Position today is a 3-day average ending today (GSC data lags a few
        days), compared against the same 3 days one week earlier - a single
        day is too noisy to trust for most queries. New/improved queries are
        shown in green, lost ones in red.
      </p>
      {!visible.length && <EmptyState text="Nothing matches this filter." />}
      {visible.map((r, i) => {
        const recentVal = metric === "impressions" ? r.recentImpressions : r.recentClicks;
        const priorVal = metric === "impressions" ? r.priorImpressions : r.priorClicks;
        const unit = metric === "impressions" ? "impr" : "clicks";
        return (
          <div key={i} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={{ ...styles.cardQuery, ...directionStyle(r.direction) }}>{r.query}</span>
              <span style={styles.cardBadge}>{r.recentPosition !== null ? `#${r.recentPosition}` : "-"}</span>
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
    </div>
  );
}

function SearchesList({ stats }: { stats: SearchLogStats }) {
  if (!stats.rows.length) {
    return <EmptyState text="No searches logged yet in this window." />;
  }
  return (
    <div style={styles.list}>
      <p style={styles.sectionNote}>
        What visitors typed into on-site search over the last 30 days,
        including the header dropdown search (not just the /search results
        page). Queries flagged &ldquo;0 results&rdquo; are the clearest
        content-gap signal - people looking for something we don&rsquo;t
        have an article for yet.
      </p>

      <div style={styles.cardStats}>
        <span>Searches: {stats.totalSearches}</span>
        <span>Found something: {stats.successfulSearches}</span>
        <span>No results: {stats.zeroResultSearches}</span>
        <span>Success rate: {pct(stats.successRate)}</span>
      </div>

      {stats.rows.slice(0, 100).map((r, i) => (
        <div key={i} style={styles.card}>
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
          </div>
        </div>
      ))}
    </div>
  );
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function CookieConsentReport({ stats }: { stats: ConsentStats }) {
  const decisions = stats.acceptAll + stats.rejectAll;
  const acceptRate = decisions > 0 ? stats.acceptAll / decisions : null;
  const reachRate =
    stats.bannerShown > 0 ? stats.totalDecisions / stats.bannerShown : null;

  return (
    <div style={styles.list}>
      <p style={styles.sectionNote}>
        Last 30 days. Banner shows and accept/reject/manage decisions are
        logged anonymously regardless of the choice itself, so this stays
        readable even though GA can now only see consenting visitors. If a
        GA4 pageview dip tracks the reject rate below, that&rsquo;s consent
        gating working as intended, not a traffic problem.
      </p>

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
      <p style={styles.sectionNote}>
        Pick the day you noticed the spike (Day A) and a day to compare it
        against (Day B - defaults to the same weekday a week earlier). Shows
        site-wide totals for each day, then the specific pages and search
        queries that account for the biggest gains and drops between them.
      </p>

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

function CompareMoverList({
  result,
  axis,
  direction,
}: {
  result: PeriodComparison;
  axis: CompareAxis;
  direction: CompareDirection;
}) {
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
      {rows.slice(0, 25).map((r, i) => (
        <div key={i} style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardQuery}>{axis === "pages" ? shortPage(r.key) : r.key}</span>
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
      ))}
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
  cannibalRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    padding: "6px 0",
    borderTop: "1px solid #3a2c1d",
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
};
