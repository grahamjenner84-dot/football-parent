"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AWAITING,
  chaseBody,
  dueAction,
  gmailComposeUrl,
  gmailThreadSearchUrl,
  OUTREACH_FROM_EMAIL,
  type OutreachStatus,
} from "@/lib/outreach/lifecycle";

// Weekly link-building queue. Drafts and prospects are written by the weekly
// outreach run (.claude/skills/football-parent-link-building); this page is where
// Graham edits, sends (via Gmail) and records outcomes. Nothing here sends
// email itself.

interface Prospect {
  id: number;
  url: string;
  domain: string;
  title: string | null;
  prospect_type: string;
  status: OutreachStatus;
  status_reason: string | null;
  score: number;
  score_reasons: string | null;
  fp_page: string | null;
  angle: string | null;
  fit_note: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_url: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  chase_line: string | null;
  sent_at: string | null;
  next_action_at: string | null;
  chase_count: number;
  won_link_url: string | null;
  notes: string | null;
}

interface Stats {
  sentThisWeek: number;
  sentThisMonth: number;
  chasesThisWeek: number;
  repliesThisMonth: number;
  wonThisMonth: number;
  wonAllTime: number;
  sentAllTime: number;
  replyRate: number | null;
  monthlyTarget: number;
  backlog: number;
}

type Tab = "week" | "waiting" | "backlog" | "parked" | "won";

const firstName = (name: string | null) => (name ? name.trim().split(/\s+/)[0] : null);

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
}

export default function OutreachAdminPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("week");
  const [busy, setBusy] = useState<number | null>(null);

  // State is only set in promise callbacks, never synchronously in the
  // effect body (react-hooks/set-state-in-effect).
  const load = useCallback(
    () =>
      fetch("/api/outreach", { cache: "no-store" })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || res.statusText);
          setProspects(json.prospects);
          setStats(json.stats);
          setError(null);
        })
        .catch((err) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const patch = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(payload.id as number);
      try {
        const res = await fetch("/api/outreach", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        await load();
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [load]
  );

  const act = (id: number, action: string, extra: Record<string, unknown> = {}) => patch({ id, kind: "action", action, ...extra });

  const groups = useMemo(() => {
    const now = new Date();
    const drafted = prospects.filter((p) => p.status === "drafted").sort((a, b) => b.score - a.score);
    const awaiting = prospects.filter((p) => AWAITING.includes(p.status));
    const due = awaiting.filter((p) => dueAction(p, now) !== null);
    const waiting = [...awaiting.filter((p) => dueAction(p, now) === null), ...prospects.filter((p) => p.status === "replied")];
    return {
      drafted,
      due,
      waiting,
      backlog: prospects.filter((p) => p.status === "backlog").sort((a, b) => b.score - a.score),
      parked: prospects.filter((p) => p.status === "parked"),
      won: prospects.filter((p) => p.status === "won"),
    };
  }, [prospects]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "week", label: "This week", count: groups.drafted.length + groups.due.length },
    { id: "waiting", label: "Waiting", count: groups.waiting.length },
    { id: "backlog", label: "Backlog", count: groups.backlog.length },
    { id: "parked", label: "Parked", count: groups.parked.length },
    { id: "won", label: "Won", count: groups.won.length },
  ];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Link outreach</h1>
          <p style={styles.subtitle}>Sending from {OUTREACH_FROM_EMAIL}. Drafts refresh every Monday.</p>
        </div>
        <a href="/admin/seo" style={styles.navLink}>SEO dashboard</a>
      </header>

      {stats && <Scoreboard stats={stats} />}

      <nav style={styles.tabBar}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}>
            {t.label} <span style={styles.count}>{t.count}</span>
          </button>
        ))}
      </nav>

      <section style={styles.body}>
        {loading && <p style={styles.muted}>Loading...</p>}
        {error && <p style={styles.error}>{error}</p>}

        {tab === "week" && !loading && (
          <>
            {groups.due.length > 0 && <h2 style={styles.h2}>Chase-ups due ({groups.due.length})</h2>}
            {groups.due.map((p) => (
              <ChaseCard key={p.id} p={p} busy={busy === p.id} act={act} />
            ))}
            <h2 style={styles.h2}>New emails ({groups.drafted.length})</h2>
            {groups.drafted.length === 0 && <p style={styles.muted}>Nothing drafted yet. The Monday run tops this up to 15.</p>}
            {groups.drafted.map((p) => (
              <DraftCard key={p.id} p={p} busy={busy === p.id} act={act} patch={patch} />
            ))}
          </>
        )}

        {tab === "waiting" &&
          groups.waiting.map((p) => (
            <div key={p.id} style={styles.card}>
              <CardHead p={p} />
              <p style={styles.meta}>
                {p.status === "replied" ? "Replied: agree the details, then mark won or lost." : `Sent ${fmtDate(p.sent_at)}. Next chase ${fmtDate(p.next_action_at)}.`}
              </p>
              <div style={styles.actions}>
                {p.status !== "replied" && <Btn onClick={() => act(p.id, "replied")} disabled={busy === p.id}>Replied</Btn>}
                <WonButton onWon={(url) => act(p.id, "won", { url })} disabled={busy === p.id} />
                <Btn onClick={() => act(p.id, "lost")} disabled={busy === p.id} subtle>Said no</Btn>
              </div>
            </div>
          ))}

        {tab === "backlog" && (
          <>
            <AddProspect onAdded={load} />
            {groups.backlog.map((p) => (
              <div key={p.id} style={styles.card}>
                <CardHead p={p} />
                {p.angle && <p style={styles.meta}>Angle: {p.angle}</p>}
                {p.fit_note && <p style={styles.meta}>{p.fit_note}</p>}
                {p.notes && <p style={styles.meta}>{p.notes}</p>}
                <p style={styles.reasons}>{p.score_reasons}</p>
                <div style={styles.actions}>
                  <Btn onClick={() => act(p.id, "skip")} disabled={busy === p.id} subtle>Skip</Btn>
                  <Btn onClick={() => act(p.id, "park")} disabled={busy === p.id} subtle>Park</Btn>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "parked" && (
          <>
            <p style={styles.muted}>Real relationships that need a partnership or press conversation, not a cold link request.</p>
            {groups.parked.map((p) => (
              <div key={p.id} style={styles.card}>
                <CardHead p={p} />
                <p style={styles.meta}>{p.status_reason}</p>
                <div style={styles.actions}>
                  <Btn onClick={() => act(p.id, "restore")} disabled={busy === p.id} subtle>Move to backlog</Btn>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "won" &&
          groups.won.map((p) => (
            <div key={p.id} style={styles.card}>
              <CardHead p={p} />
              {p.won_link_url && (
                <a href={p.won_link_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                  {p.won_link_url}
                </a>
              )}
            </div>
          ))}
      </section>
    </main>
  );
}

function Scoreboard({ stats }: { stats: Stats }) {
  const tiles = [
    { label: "Links this month", value: `${stats.wonThisMonth} / ${stats.monthlyTarget}` },
    { label: "Sent this week", value: String(stats.sentThisWeek) },
    { label: "Chases this week", value: String(stats.chasesThisWeek) },
    { label: "Reply rate", value: stats.replyRate == null ? "-" : `${Math.round(stats.replyRate * 100)}%` },
    { label: "Backlog", value: String(stats.backlog) },
  ];
  return (
    <div style={styles.tiles}>
      {tiles.map((t) => (
        <div key={t.label} style={styles.tile}>
          <div style={styles.tileValue}>{t.value}</div>
          <div style={styles.tileLabel}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

function CardHead({ p }: { p: Prospect }) {
  return (
    <div>
      <div style={styles.cardTop}>
        <span style={styles.domain}>{p.domain}</span>
        <span style={styles.pill}>{p.prospect_type}</span>
        <span style={styles.score}>{p.score}</span>
      </div>
      <a href={p.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
        {p.title || p.url}
      </a>
      {p.fp_page && <p style={styles.meta}>Pitching: {p.fp_page}</p>}
    </div>
  );
}

type ActFn = (id: number, action: string, extra?: Record<string, unknown>) => Promise<void>;

function DraftCard({ p, busy, act, patch }: { p: Prospect; busy: boolean; act: ActFn; patch: (x: Record<string, unknown>) => Promise<void> }) {
  const [to, setTo] = useState(p.contact_email ?? "");
  const [subject, setSubject] = useState(p.draft_subject ?? "");
  const [body, setBody] = useState(p.draft_body ?? "");
  const dirty = to !== (p.contact_email ?? "") || subject !== (p.draft_subject ?? "") || body !== (p.draft_body ?? "");

  const save = () => patch({ id: p.id, kind: "draft", subject, body, contact_email: to || null });

  return (
    <div style={styles.card}>
      <CardHead p={p} />
      {p.angle && <p style={styles.meta}>Angle: {p.angle}</p>}
      <label style={styles.label}>
        To {p.contact_name ? `(${p.contact_name})` : ""}
        <input value={to} onChange={(e) => setTo(e.target.value)} style={styles.input} placeholder="no email found" />
      </label>
      {!to && p.contact_url && (
        <p style={styles.meta}>
          No email found, use their{" "}
          <a href={p.contact_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
            contact form
          </a>
          .
        </p>
      )}
      <label style={styles.label}>
        Subject
        <input value={subject} onChange={(e) => setSubject(e.target.value)} style={styles.input} />
      </label>
      <label style={styles.label}>
        Email
        <textarea value={body} onChange={(e) => setBody(e.target.value)} style={styles.textarea} rows={12} />
      </label>
      <div style={styles.actions}>
        {dirty && <Btn onClick={save} disabled={busy}>Save edits</Btn>}
        {to ? (
          <a
            href={gmailComposeUrl({ to, subject, body })}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.primary}
            onClick={() => {
              if (dirty) save();
            }}
          >
            Open in Gmail
          </a>
        ) : (
          <Btn onClick={() => navigator.clipboard.writeText(body)}>Copy text</Btn>
        )}
        <Btn onClick={() => act(p.id, "mark_sent")} disabled={busy}>Sent</Btn>
        <Btn onClick={() => act(p.id, "skip")} disabled={busy} subtle>Skip</Btn>
      </div>
    </div>
  );
}

function ChaseCard({ p, busy, act }: { p: Prospect; busy: boolean; act: ActFn }) {
  const close = dueAction(p) === "close";
  const n = (p.chase_count + 1) as 1 | 2;
  const [text, setText] = useState(close ? "" : chaseBody({ firstName: firstName(p.contact_name), n, personal: p.chase_line }));

  return (
    <div style={styles.card}>
      <CardHead p={p} />
      <p style={styles.meta}>
        {close
          ? `Two chases sent, last on ${fmtDate(p.next_action_at)}. Close it off?`
          : `Chase ${n} of 2. Sent ${fmtDate(p.sent_at)} to ${p.contact_email ?? "contact form"}. Reply in the original thread so your first email is quoted underneath.`}
      </p>
      {!close && <textarea value={text} onChange={(e) => setText(e.target.value)} style={styles.textarea} rows={7} />}
      <div style={styles.actions}>
        {!close && (
          <>
            <Btn onClick={() => navigator.clipboard.writeText(text)}>Copy chase</Btn>
            {p.contact_email && (
              <a href={gmailThreadSearchUrl(p.contact_email)} target="_blank" rel="noopener noreferrer" style={styles.primary}>
                Open thread
              </a>
            )}
            <Btn onClick={() => act(p.id, "mark_chased")} disabled={busy}>Chased</Btn>
          </>
        )}
        {close && <Btn onClick={() => act(p.id, "no_reply")} disabled={busy}>Close: no reply</Btn>}
        <Btn onClick={() => act(p.id, "replied")} disabled={busy} subtle>They replied</Btn>
      </div>
    </div>
  );
}

function WonButton({ onWon, disabled }: { onWon: (url: string) => void; disabled: boolean }) {
  return (
    <Btn
      disabled={disabled}
      onClick={() => {
        const url = prompt("Page where the link is live:");
        if (url) onWon(url.trim());
      }}
    >
      Won
    </Btn>
  );
}

function AddProspect({ onAdded }: { onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [angle, setAngle] = useState("");
  const [fpPage, setFpPage] = useState("");
  const [domainScore, setDomainScore] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const add = async () => {
    const res = await fetch("/api/outreach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url,
        contact_email: email || undefined,
        angle: angle || undefined,
        fp_page: fpPage || undefined,
        domain_score: domainScore || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) return setMsg(json.error);
    setMsg(
      json.outcome === "added"
        ? json.status === "backlog"
          ? "Added to the backlog."
          : `Added as ${json.status}: ${(json.reasons ?? []).join("; ")}`
        : json.outcome === "duplicate"
          ? "Already in the list."
          : "Already in conversation with that site."
    );
    setUrl("");
    setEmail("");
    setAngle("");
    setFpPage("");
    setDomainScore("");
    onAdded();
  };

  return (
    <div style={styles.card}>
      <p style={styles.meta}>Add a prospect by hand (same quality checks as the weekly run).</p>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://page-you-want-a-link-from" style={styles.input} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact email (optional)" style={styles.input} />
      <textarea
        value={angle}
        onChange={(e) => setAngle(e.target.value)}
        placeholder="Angle / notes (optional): why they'd link, who you know there, what to offer"
        style={styles.textarea}
        rows={3}
      />
      <input value={fpPage} onChange={(e) => setFpPage(e.target.value)} placeholder="Our page to pitch (optional), e.g. /coaching/equal-playing-time-in-grassroots-football" style={styles.input} />
      <input
        value={domainScore}
        onChange={(e) => setDomainScore(e.target.value)}
        placeholder="Domain score, DA or DR 0-100 (optional)"
        inputMode="numeric"
        style={styles.input}
      />
      <div style={styles.actions}>
        <Btn onClick={add} disabled={!url}>Add</Btn>
      </div>
      {msg && <p style={styles.meta}>{msg}</p>}
    </div>
  );
}

function Btn({ children, onClick, disabled, subtle }: { children: ReactNode; onClick: () => void; disabled?: boolean; subtle?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...(subtle ? styles.subtle : styles.button), opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

// Same palette as /admin/instagram-review.
const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "#1a1410", color: "#f0e6d2", fontFamily: "system-ui, sans-serif", paddingBottom: 80 },
  header: { padding: "20px 16px 12px", borderBottom: "1px solid #3a2c1d", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  title: { margin: 0, fontSize: 19, color: "#e8b04b" },
  subtitle: { margin: "4px 0 0", fontSize: 12, color: "#9c8a72" },
  navLink: { color: "#c9b896", fontSize: 13, textDecoration: "none", border: "1px solid #3a2c1d", borderRadius: 8, padding: "8px 12px", whiteSpace: "nowrap" },
  tiles: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, padding: "12px 16px" },
  tile: { background: "#241b14", border: "1px solid #3a2c1d", borderRadius: 10, padding: "10px 12px" },
  tileValue: { fontSize: 20, fontWeight: 700, color: "#e8b04b" },
  tileLabel: { fontSize: 11, color: "#9c8a72", marginTop: 2 },
  tabBar: { display: "flex", gap: 6, padding: "4px 16px 8px", overflowX: "auto" },
  tab: { background: "transparent", border: "1px solid #3a2c1d", color: "#c9b896", borderRadius: 999, padding: "7px 12px", fontSize: 13, whiteSpace: "nowrap", cursor: "pointer" },
  tabActive: { background: "#e8b04b", color: "#1a1410", borderColor: "#e8b04b" },
  count: { opacity: 0.7, marginLeft: 4 },
  body: { padding: "4px 16px", maxWidth: 760, margin: "0 auto" },
  h2: { fontSize: 14, color: "#c9b896", margin: "18px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 },
  card: { background: "#241b14", border: "1px solid #3a2c1d", borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  domain: { fontWeight: 600, fontSize: 15, flex: 1, overflowWrap: "anywhere" },
  pill: { fontSize: 11, border: "1px solid #3a2c1d", borderRadius: 999, padding: "2px 8px", color: "#c9b896" },
  score: { fontSize: 12, color: "#e8b04b", fontWeight: 700 },
  link: { color: "#8fb3d9", fontSize: 13, overflowWrap: "anywhere" },
  meta: { fontSize: 13, color: "#c9b896", margin: "6px 0" },
  reasons: { fontSize: 11, color: "#9c8a72", margin: "6px 0" },
  label: { display: "block", fontSize: 12, color: "#9c8a72", marginTop: 10 },
  input: { display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, marginBottom: 6, background: "#1a1410", color: "#f0e6d2", border: "1px solid #3a2c1d", borderRadius: 8, padding: "9px 10px", fontSize: 14 },
  textarea: { display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, background: "#1a1410", color: "#f0e6d2", border: "1px solid #3a2c1d", borderRadius: 8, padding: 10, fontSize: 14, lineHeight: 1.45, fontFamily: "inherit" },
  actions: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  button: { background: "#3a2c1d", color: "#f0e6d2", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 14, cursor: "pointer" },
  primary: { background: "#e8b04b", color: "#1a1410", borderRadius: 8, padding: "9px 14px", fontSize: 14, fontWeight: 600, textDecoration: "none" },
  subtle: { background: "transparent", color: "#9c8a72", border: "1px solid #3a2c1d", borderRadius: 8, padding: "9px 14px", fontSize: 14, cursor: "pointer" },
  muted: { color: "#9c8a72", fontSize: 13 },
  error: { color: "#e57373", fontSize: 13 },
};
