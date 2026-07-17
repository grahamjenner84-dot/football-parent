"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type {
  SeoReport,
  StrikingRow,
  LowCtrRow,
  DecayRow,
  CannibalRow,
} from "@/lib/gsc";

type Tab = "striking" | "ctr" | "decay" | "cannibal";

const TABS: { id: Tab; label: string }[] = [
  { id: "striking", label: "Striking distance" },
  { id: "ctr", label: "Low CTR" },
  { id: "decay", label: "Decay" },
  { id: "cannibal", label: "Cannibalisation" },
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
  const [tab, setTab] = useState<Tab>("striking");

  useEffect(() => {
    fetch("/api/seo-report")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load report");
        }
        return res.json();
      })
      .then((data: SeoReport) => setReport(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>SEO optimisation report</h1>
        {report && (
          <p style={styles.subtitle}>
            {report.periodStart} to {report.periodEnd}
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
            {report && <span style={styles.tabCount}>{countFor(report, t.id)}</span>}
          </button>
        ))}
      </nav>

      <main style={styles.content}>
        {loading && <p style={styles.muted}>Loading report...</p>}
        {error && <p style={styles.error}>{error}</p>}
        {report && !loading && !error && (
          <>
            {tab === "striking" && <StrikingList rows={report.strikingDistance} />}
            {tab === "ctr" && <LowCtrList rows={report.lowCtr} />}
            {tab === "decay" && <DecayList rows={report.decay} />}
            {tab === "cannibal" && <CannibalList rows={report.cannibalisation} />}
          </>
        )}
      </main>
    </div>
  );
}

function countFor(report: SeoReport, tab: Tab): number {
  switch (tab) {
    case "striking":
      return report.strikingDistance.length;
    case "ctr":
      return report.lowCtr.length;
    case "decay":
      return report.decay.length;
    case "cannibal":
      return report.cannibalisation.length;
  }
}

function EmptyState({ text }: { text: string }) {
  return <p style={styles.muted}>{text}</p>;
}

function StrikingList({ rows }: { rows: StrikingRow[] }) {
  if (!rows.length) return <EmptyState text="Nothing on page 2 right now." />;
  return (
    <div style={styles.list}>
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

function LowCtrList({ rows }: { rows: LowCtrRow[] }) {
  if (!rows.length) return <EmptyState text="No pages underperforming on CTR." />;
  return (
    <div style={styles.list}>
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
    border: "1px solid #3a2c1d",
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
  error: {
    color: "#e07856",
    fontSize: 14,
  },
};
