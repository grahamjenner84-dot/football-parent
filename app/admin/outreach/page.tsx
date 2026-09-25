"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AWAITING,
  chaseBody,
  dueAction,
  gmailComposeUrl,
  gmailThreadSearchUrl,
  OUTREACH_FROM_EMAIL,
  STATUSES,
  type OutreachStatus,
} from "@/lib/outreach/lifecycle";
import { explainScore, SCORE_SUMMARY } from "@/lib/outreach/score-explain";
import { compareStrength, toStrength, type OurStrength } from "@/lib/outreach/strength";

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
  last_contact_at: string | null;
  next_action_at: string | null;
  chase_count: number;
  won_link_url: string | null;
  notes: string | null;
  source: string;
  fit: number | null;
  authority: number | null;
  created_at: string;
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

type Tab = "week" | "backlog" | "noReply" | "discussion" | "rejected" | "won" | "parked" | "ruledOut";

const firstName = (name: string | null) => (name ? name.trim().split(/\s+/)[0] : null);

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
}

export default function OutreachAdminPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [ourStrength, setOurStrength] = useState<OurStrength | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("week");
  const [busy, setBusy] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

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
          setOurStrength(json.ourStrength ?? null);
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
    const byLatest = (a: Prospect, b: Prospect) => (b.last_contact_at ?? b.sent_at ?? "").localeCompare(a.last_contact_at ?? a.sent_at ?? "");
    return {
      drafted,
      due,
      // Emailed, nothing back yet: still being chased (and not due this
      // week) plus closed as no reply after the second chase.
      noReply: [...awaiting.filter((p) => dueAction(p, now) === null), ...prospects.filter((p) => p.status === "no_reply")].sort(byLatest),
      discussion: prospects.filter((p) => p.status === "replied").sort(byLatest),
      rejected: prospects.filter((p) => p.status === "lost").sort(byLatest),
      backlog: prospects.filter((p) => p.status === "backlog").sort((a, b) => b.score - a.score),
      // Not good leads: ones Graham ruled out, plus partnership-only sites the
      // quality filter set aside (FA pages, homepages, partner pages).
      parked: prospects.filter((p) => p.status === "skipped" || p.status === "parked"),
      won: prospects.filter((p) => p.status === "won"),
      // Looked at and ruled out (by the filter, a run's vetting or audit, or
      // the backlog re-check), newest first, with the reason.
      ruledOut: prospects.filter((p) => p.status === "rejected").sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }, [prospects]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "week", label: "This week", count: groups.drafted.length + groups.due.length },
    { id: "backlog", label: "Backlog", count: groups.backlog.length },
    { id: "noReply", label: "Emailed: no reply", count: groups.noReply.length },
    { id: "discussion", label: "Emailed: in discussion", count: groups.discussion.length },
    { id: "rejected", label: "Emailed: rejected", count: groups.rejected.length },
    { id: "won", label: "Won (live)", count: groups.won.length },
    { id: "parked", label: "Parked", count: groups.parked.length },
    { id: "ruledOut", label: "Ruled out", count: groups.ruledOut.length },
  ];

  const rowsFor = (t: Tab): Prospect[] =>
    t === "week" ? [...groups.due, ...groups.drafted] : (groups as unknown as Record<string, Prospect[]>)[t] ?? [];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Link outreach</h1>
          <p style={styles.subtitle}>Sending from {OUTREACH_FROM_EMAIL}. Drafts refresh every Monday.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={() => setShowAdd((v) => !v)} style={styles.addButton}>
            {showAdd ? "Close" : "+ Add prospects"}
          </button>
          <a href="/admin/seo" style={styles.navLink}>SEO dashboard</a>
        </div>
      </header>

      {showAdd && <AddPanel onChanged={load} />}

      {stats && <Scoreboard stats={stats} ourStrength={ourStrength} />}

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

        {!loading && (
          <>
            <p style={styles.muted}>{TAB_HELP[tab]}</p>
            {tab === "backlog" && <RecheckBar onDone={load} />}
            <ProspectTable
              rows={rowsFor(tab)}
              expanded={expanded}
              onToggle={(id) => setExpanded((cur) => (cur === id ? null : id))}
              renderDetail={(p) => <ProspectDetail key={p.id} p={p} busy={busy === p.id} act={act} patch={patch} />}
              ours={toStrength(ourStrength?.rank)}
            />
          </>
        )}
      </section>
    </main>
  );
}

function Scoreboard({ stats, ourStrength }: { stats: Stats; ourStrength: OurStrength | null }) {
  const ours = toStrength(ourStrength?.rank);
  const tiles = [
    {
      label: ourStrength
        ? `Your domain strength (${ourStrength.referringDomains ?? "?"} linking sites, ${fmtDate(ourStrength.date)})`
        : "Your domain strength (not measured yet)",
      value: ours == null ? "-" : `${ours} / 100`,
    },
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

type ActFn = (id: number, action: string, extra?: Record<string, unknown>) => Promise<void>;

function DraftCard({ p, busy, act, patch }: { p: Prospect; busy: boolean; act: ActFn; patch: (x: Record<string, unknown>) => Promise<void> }) {
  const [to, setTo] = useState(p.contact_email ?? "");
  const [subject, setSubject] = useState(p.draft_subject ?? "");
  const [body, setBody] = useState(p.draft_body ?? "");
  const dirty = to !== (p.contact_email ?? "") || subject !== (p.draft_subject ?? "") || body !== (p.draft_body ?? "");

  const save = () => patch({ id: p.id, kind: "draft", subject, body, contact_email: to || null });

  return (
    <div>
      <h3 style={styles.h3}>Email to send</h3>
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
    <div>
      <h3 style={styles.h3}>{close ? "Close it off?" : `Chase ${n} of 2`}</h3>
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

function WonButton({ onWon, disabled, label = "Won" }: { onWon: (url: string) => void; disabled: boolean; label?: string }) {
  return (
    <Btn
      disabled={disabled}
      onClick={() => {
        const url = prompt("Page where the link is live:");
        if (url) onWon(url.trim());
      }}
    >
      {label}
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
        : `Already on the list: ${describeKnown(json.existing)}`
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

interface Known {
  domain: string;
  status: OutreachStatus;
  sent_at: string | null;
}

const STATUS_LABEL: Partial<Record<OutreachStatus, string>> = {
  backlog: "in the backlog",
  drafted: "drafted, not sent yet",
  sent: "waiting for a reply",
  chase_1: "chased once",
  chase_2: "chased twice",
  replied: "in discussion",
  won: "link won",
  lost: "said no",
  no_reply: "no reply",
  skipped: "not a good lead",
  rejected: "ruled out",
  parked: "parked",
};

function describeKnown(k: Known | null | undefined): string {
  if (!k) return "that site";
  const when = k.sent_at ? `, emailed ${fmtDate(k.sent_at)}` : "";
  return `${k.domain} (${STATUS_LABEL[k.status] ?? k.status}${when})`;
}

const COLUMN_LABEL: Record<string, string> = {
  url: "web address",
  title: "site name",
  emailedAt: "date emailed",
  domainScore: "domain score",
  contactEmail: "contact email",
  angle: "what you pitched",
  status: "status",
  notes: "notes",
  wonUrl: "live link",
};

interface PreviewRow {
  line: number;
  url: string;
  title: string | null;
  domain: string;
  emailedAt: string | null;
  domainScore: number | null;
  contactEmail: string | null;
  angle: string | null;
  notes: string | null;
  resolved: { status: OutreachStatus };
  existing: Known | null;
  // Saved by an earlier import of the sheet: a re-import overwrites it.
  fromEarlierImport?: boolean;
}

// Backlog files the link-building skill has committed (after Graham's
// review), loaded into the queue in one tap. Rows go through the same gate
// and duplicate check as everything else.
function ReviewedBacklogs({ onLoaded }: { onLoaded: () => void }) {
  const [files, setFiles] = useState<{ name: string; rows: number; loaded: number; removed: number; removedLoaded: number }[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const refresh = useCallback(
    () =>
      fetch("/api/outreach/backlogs", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => (j.error ? setMsg(j.error) : setFiles(j.files)))
        .catch((e) => setMsg(String(e))),
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadFile = async (name: string) => {
    setWorking(name);
    try {
      const res = await fetch("/api/outreach/backlogs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: name }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      const r = j.results as { outcome: string; status?: string; existing?: Known }[];
      const ro = (j.ruledOut ?? []) as { outcome: string }[];
      const n = (f: (x: (typeof r)[number]) => boolean) => r.filter(f).length;
      const known = r.filter((x) => x.outcome === "domain_known" && x.existing).map((x) => describeKnown(x.existing));
      setMsg(
        `Loaded ${name}: ${n((x) => x.outcome === "added" && x.status === "backlog")} to the backlog, ` +
          `${n((x) => x.outcome === "added" && x.status === "parked")} parked, ` +
          `${n((x) => x.outcome === "added" && x.status === "rejected")} rejected by the gate, ` +
          `${n((x) => x.outcome === "duplicate")} already loaded` +
          (known.length ? `, ${known.length} already on your list: ${known.join("; ")}` : "") +
          (ro.length ? `. ${ro.filter((x) => x.outcome !== "already_known").length} of the research's removals recorded under Ruled out` : "") +
          "."
      );
      await refresh();
      onLoaded();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(null);
    }
  };

  if (files === null && !msg) return <p style={styles.muted}>Loading...</p>;
  if (!files?.length && !msg) return <p style={styles.muted}>No research files yet. Ask Claude to do link building and its reviewed list will appear here.</p>;
  return (
    <div style={styles.card}>
      <p style={styles.meta}>{"Reviewed backlogs from link building. Import your past outreach first, so anyone you've already emailed is caught."}</p>
      {files?.map((f) => (
        <div key={f.name} style={{ ...styles.actions, alignItems: "center" }}>
          <span style={{ ...styles.meta, flex: 1 }}>
            {f.name.replace("outreach-backlog-", "").replace(".json", "")}: {f.rows} prospects{f.loaded ? `, ${f.loaded} already loaded` : ""}
            {f.removed ? `; ${f.removed} ruled out by the research${f.removedLoaded ? `, ${f.removedLoaded} recorded` : ""}` : ""}
          </span>
          {(f.loaded < f.rows || f.removedLoaded < f.removed) && (
            <Btn onClick={() => loadFile(f.name)} disabled={working !== null}>
              {working === f.name
                ? "Loading..."
                : [f.loaded < f.rows ? `Load ${f.rows - f.loaded}` : "", f.removedLoaded < f.removed ? `record ${f.removed - f.removedLoaded} ruled out` : ""]
                    .filter(Boolean)
                    .join(" + ")}
            </Btn>
          )}
        </div>
      ))}
      {msg && <p style={styles.meta}>{msg}</p>}
    </div>
  );
}

// Paste straight from the spreadsheet (select the cells including the header
// row, copy, paste) or pick a CSV. Preview first, nothing is written until
// "Import".
function ImportHistory({ onImported, startOpen = false }: { onImported: () => void; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ rows: PreviewRow[]; errors: string[]; columns: Record<string, string | null> } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const send = async (isPreview: boolean) => {
    setWorking(true);
    setMsg(null);
    try {
      const res = await fetch("/api/outreach/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, preview: isPreview }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      if (isPreview) {
        setPreview(json);
      } else {
        const r = json.results as { outcome: string }[];
        const n = (o: string) => r.filter((x) => x.outcome === o).length;
        setMsg(`Imported: ${n("added")} new, ${n("updated")} updated from the backlog, ${n("already_contacted")} already on the list and left alone.`);
        setPreview(null);
        setText("");
        onImported();
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setWorking(false);
    }
  };

  if (!open) {
    return (
      <div style={styles.card}>
        <p style={styles.meta}>Already emailed sites elsewhere? Import them so nothing gets pitched twice.</p>
        <div style={styles.actions}>
          <Btn onClick={() => setOpen(true)}>Import past outreach</Btn>
        </div>
        {msg && <p style={styles.meta}>{msg}</p>}
      </div>
    );
  }

  const willImport = preview ? preview.rows.filter((r) => !r.existing || r.fromEarlierImport || ["backlog", "drafted", "parked", "skipped"].includes(r.existing.status)) : [];

  return (
    <div style={styles.card}>
      <p style={styles.meta}>
        Copy the rows from your sheet <strong>including the header row</strong> and paste them here, or choose a CSV. It needs a URL column. It
        also reads: site name, email, date contacted (14/06 or 14/06/2026), what you pitched, domain score (DA/DR) and status (e.g. replied,
        no reply, said no, linked).
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
        placeholder={"Site\temail\tWhen contacted\tWhat pitched\tDomain Auth\tURL"}
        style={styles.textarea}
        rows={6}
      />
      <input
        type="file"
        accept=".csv,.tsv,.txt"
        style={{ ...styles.meta, marginTop: 8 }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            setText(await f.text());
            setPreview(null);
          }
        }}
      />
      <div style={styles.actions}>
        <Btn onClick={() => send(true)} disabled={!text.trim() || working}>
          Preview
        </Btn>
        {preview && willImport.length > 0 && (
          <Btn onClick={() => send(false)} disabled={working}>
            Import {willImport.length} site{willImport.length === 1 ? "" : "s"}
          </Btn>
        )}
        <Btn
          subtle
          onClick={() => {
            setOpen(false);
            setPreview(null);
          }}
        >
          Close
        </Btn>
      </div>
      {msg && <p style={styles.meta}>{msg}</p>}
      {preview && (
        <>
          <p style={styles.reasons}>
            Columns read:{" "}
            {Object.entries(preview.columns)
              .filter(([, v]) => v)
              .map(([k, v]) => `${v} → ${COLUMN_LABEL[k] ?? k}`)
              .join(", ")}
          </p>
          {preview.errors.map((e) => (
            <p key={e} style={styles.error}>
              {e}
            </p>
          ))}
          {preview.rows.map((r) => {
            const skip = r.existing && !r.fromEarlierImport && !["backlog", "drafted", "parked", "skipped"].includes(r.existing.status);
            return (
              <div key={r.line} style={{ borderTop: "1px solid #3a2c1d", padding: "8px 0", opacity: skip ? 0.55 : 1 }}>
                <div style={styles.cardTop}>
                  <span style={styles.domain}>{r.title || r.domain}</span>
                  <span style={styles.pill}>{skip ? "already on list" : (STATUS_LABEL[r.resolved.status] ?? r.resolved.status)}</span>
                </div>
                <p style={styles.reasons}>
                  {r.domain}
                  {r.emailedAt ? ` · emailed ${fmtDate(r.emailedAt)}` : " · no date"}
                  {r.domainScore != null ? ` · DA ${r.domainScore}` : ""}
                  {r.contactEmail ? ` · ${r.contactEmail}` : ""}
                </p>
                {r.angle && <p style={styles.reasons}>Pitched: {r.angle}</p>}
                {r.notes && <p style={styles.reasons}>{r.notes}</p>}
                {r.existing && <p style={styles.reasons}>{skip ? "Left alone: " : r.fromEarlierImport ? "Replaces earlier import: " : "Will update: "}{describeKnown(r.existing)}</p>}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

const TAB_HELP: Record<Tab, string> = {
  week: "This week's new emails (topped up to 15 every Monday) and any chase-ups due. Tap a row to edit the email and send it.",
  backlog: "Everyone not contacted yet, highest priority first. The Monday run drafts from the top. Tap a row to see or change anything.",
  noReply: "Emailed with nothing back: still being chased, or closed after the second chase.",
  discussion: "They replied and it looks promising. Mark won once the link is live.",
  rejected: "Said no, or went nowhere after replying. Kept so they aren't pitched again.",
  won: "Links that are live.",
  parked: "Not good leads: ones you've ruled out, plus FA, homepage and partner pages the filter set aside as partnership-only.",
  ruledOut:
    "Everything looked at and ruled out, with the reason: by the quality rules, a research run's vetting or audit, or the backlog re-check. Kept so it's never found, read or paid for again. Tap one and use Back to backlog if the rules got it wrong.",
};

function rowStatus(p: Prospect): string {
  if (p.status === "rejected") {
    const why = (p.status_reason ?? "no reason recorded").replace(/^Ruled out by the updated rules: /, "");
    return `Ruled out: ${why.length > 90 ? `${why.slice(0, 87)}...` : why}`;
  }
  if (p.status === "drafted") return "Draft ready";
  const due = dueAction(p);
  if (due === "chase") return `Chase ${p.chase_count + 1} due`;
  if (due === "close") return "Close off?";
  if (AWAITING.includes(p.status) && p.next_action_at) return `${STATUS_LABEL[p.status]}, chase ${fmtDate(p.next_action_at)}`;
  return STATUS_LABEL[p.status] ?? p.status;
}

// Re-runs the current URL rules over the backlog (free, no page reads) and
// moves anything they now reject to Ruled out.
function RecheckBar({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const run = async () => {
    setWorking(true);
    setMsg(null);
    try {
      const res = await fetch("/api/outreach/recheck", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      const moved = j.moved as { url: string; reason: string }[];
      setMsg(moved.length ? `Moved ${moved.length} to Ruled out.` : "Nothing in the backlog fails the current rules.");
      onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  };
  return (
    <div style={{ ...styles.actions, alignItems: "center", marginBottom: 10 }}>
      <Btn onClick={run} disabled={working}>
        {working ? "Checking..." : "Re-check against current rules"}
      </Btn>
      <span style={styles.muted}>
        {msg ?? "Free: re-applies the address rules (club policy, ethos, handbook pages...). Links-only pages are caught when the next run reads them."}
      </span>
    </div>
  );
}

// Add one / import past outreach / load research: kept out of the backlog
// list behind the header's "+ Add prospects" button.
function AddPanel({ onChanged }: { onChanged: () => void }) {
  const [mode, setMode] = useState<"one" | "import" | "research">("one");
  return (
    <section style={{ ...styles.body, paddingTop: 12 }}>
      <div style={styles.card}>
        <div style={{ ...styles.tabBar, padding: 0, marginBottom: 8 }}>
          {(
            [
              ["one", "Add one"],
              ["import", "Import past outreach"],
              ["research", "Load research"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} onClick={() => setMode(id)} style={{ ...styles.tab, ...(mode === id ? styles.tabActive : {}) }}>
              {label}
            </button>
          ))}
        </div>
        {mode === "one" && <AddProspect onAdded={onChanged} />}
        {mode === "import" && <ImportHistory onImported={onChanged} startOpen />}
        {mode === "research" && <ReviewedBacklogs onLoaded={onChanged} />}
      </div>
    </section>
  );
}

function ScoreCell({ p }: { p: Prospect }) {
  // Fixed-position tooltip anchored to the badge, so the table's horizontal
  // scroll container can't clip it.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const parts = explainScore(p.score_reasons);
  if (!parts.length) {
    return (
      <span style={styles.muted} title="Only prospects waiting to be contacted are scored.">
        -
      </span>
    );
  }
  const place = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const width = 340;
    const below = window.innerHeight - r.bottom > 320;
    setPos({ top: below ? r.bottom + 6 : Math.max(8, r.top - 326), left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) });
  };
  return (
    <span
      style={{ display: "inline-block" }}
      onMouseEnter={(e) => place(e.currentTarget)}
      onMouseLeave={() => setPos(null)}
      onClick={(e) => {
        e.stopPropagation();
        if (pos) setPos(null);
        else place(e.currentTarget);
      }}
    >
      <span style={styles.scoreBadge}>{p.score}</span>
      {pos && (
        <span style={{ ...styles.tooltip, top: pos.top, left: pos.left }}>
          <ScoreBreakdown p={p} />
        </span>
      )}
    </span>
  );
}

function ScoreBreakdown({ p }: { p: Prospect }) {
  const parts = explainScore(p.score_reasons);
  return (
    <span style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: 6, color: "#c9b896" }}>{SCORE_SUMMARY}</span>
      {parts.map((part) => (
        <span key={part.label} style={{ display: "block", margin: "4px 0" }}>
          <strong style={{ color: part.points < 0 ? "#e57373" : "#e8b04b" }}>
            {part.points > 0 ? "+" : ""}
            {part.points}
          </strong>{" "}
          <strong>{part.label}</strong>: {part.why}
        </span>
      ))}
      <span style={{ display: "block", marginTop: 6, borderTop: "1px solid #3a2c1d", paddingTop: 6 }}>
        <strong style={{ color: "#e8b04b" }}>= {p.score}</strong>
      </span>
    </span>
  );
}

function ProspectTable({
  rows,
  expanded,
  onToggle,
  renderDetail,
  ours,
}: {
  rows: Prospect[];
  expanded: number | null;
  onToggle: (id: number) => void;
  renderDetail: (p: Prospect) => ReactNode;
  ours: number | null;
}) {
  if (!rows.length) return <p style={styles.muted}>Nothing here yet.</p>;
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {["Site", "Score", "Strength", "Fit", "Type", "Pitching", "Contact", "Emailed", "Last contact", "Status"].map((h) => (
              <th key={h} style={styles.th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <Fragment key={p.id}>
              <tr onClick={() => onToggle(p.id)} style={{ ...styles.tr, ...(expanded === p.id ? styles.trOpen : {}) }}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 600 }}>{p.title || p.domain}</div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={styles.link} onClick={(e) => e.stopPropagation()}>
                    {p.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  </a>
                </td>
                <td style={styles.td}>
                  <ScoreCell p={p} />
                </td>
                <td style={styles.tdNowrap} title="Domain strength 0-100 (DataForSEO rank / 10, or the DA/DR you entered)">
                  {toStrength(p.authority) ?? "-"}
                  {compareStrength(toStrength(p.authority), ours) && (
                    <div style={styles.reasons}>{compareStrength(toStrength(p.authority), ours)}</div>
                  )}
                </td>
                <td style={styles.tdNowrap}>{p.fit != null ? `${p.fit}/10` : "-"}</td>
                <td style={styles.td}>{p.prospect_type.replace("_", " ")}</td>
                <td style={{ ...styles.td, maxWidth: 220 }}>{p.fp_page ?? "-"}</td>
                <td style={{ ...styles.td, maxWidth: 200 }}>{p.contact_email ?? (p.contact_url ? "contact form" : "-")}</td>
                <td style={styles.tdNowrap}>{fmtDate(p.sent_at) || "-"}</td>
                <td style={styles.tdNowrap}>{fmtDate(p.last_contact_at) || "-"}</td>
                <td style={styles.td}>{rowStatus(p)}</td>
              </tr>
              {expanded === p.id && (
                <tr>
                  <td colSpan={10} style={styles.detailCell}>
                    {renderDetail(p)}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Everything about one prospect, opened by tapping its row: the email or
// chase if one is due, quick outcome buttons, any status by hand, editable
// details, and how the score was worked out.
function ProspectDetail({ p, busy, act, patch }: { p: Prospect; busy: boolean; act: ActFn; patch: (x: Record<string, unknown>) => Promise<void> }) {
  const [status, setStatus] = useState<OutreachStatus>(p.status);
  const [f, setF] = useState({
    title: p.title ?? "",
    contact_name: p.contact_name ?? "",
    contact_email: p.contact_email ?? "",
    contact_url: p.contact_url ?? "",
    fp_page: p.fp_page ?? "",
    angle: p.angle ?? "",
    notes: p.notes ?? "",
    won_link_url: p.won_link_url ?? "",
    fit: p.fit != null ? String(p.fit) : "",
    da: p.authority != null ? String(Math.round(p.authority / 10)) : "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((cur) => ({ ...cur, [k]: e.target.value }));
  const due = dueAction(p);

  const saveFields = () =>
    patch({
      id: p.id,
      kind: "fields",
      fields: {
        title: f.title,
        contact_name: f.contact_name,
        contact_email: f.contact_email,
        contact_url: f.contact_url,
        fp_page: f.fp_page,
        angle: f.angle,
        notes: f.notes,
        won_link_url: f.won_link_url,
        fit: f.fit === "" ? null : Number(f.fit),
        authority: f.da === "" ? null : Math.round(Number(f.da) * 10),
      },
    });

  const input = (label: string, k: keyof typeof f, placeholder = "") => (
    <label style={styles.label}>
      {label}
      <input value={f[k]} onChange={set(k)} placeholder={placeholder} style={styles.input} />
    </label>
  );

  return (
    <div style={styles.detailGrid} onClick={(e) => e.stopPropagation()}>
      <div>
        {p.status === "drafted" && <DraftCard p={p} busy={busy} act={act} patch={patch} />}
        {due && <ChaseCard p={p} busy={busy} act={act} />}

        <h3 style={styles.h3}>Update status</h3>
        <div style={styles.actions}>
          {["backlog", "drafted"].includes(p.status) && <Btn onClick={() => act(p.id, "mark_sent")} disabled={busy}>Mark emailed</Btn>}
          {p.status !== "replied" && <Btn onClick={() => act(p.id, "replied")} disabled={busy}>They replied</Btn>}
          {p.status !== "won" && <WonButton onWon={(url) => act(p.id, "won", { url })} disabled={busy} />}
          {!["lost", "backlog", "parked", "skipped", "drafted"].includes(p.status) && (
            <Btn onClick={() => act(p.id, "lost")} disabled={busy} subtle>Said no</Btn>
          )}
          {["backlog", "drafted"].includes(p.status) && (
            <Btn onClick={() => act(p.id, "skip")} disabled={busy} subtle>Not a good lead</Btn>
          )}
          {["parked", "skipped", "no_reply", "rejected"].includes(p.status) && (
            <Btn onClick={() => act(p.id, "restore")} disabled={busy} subtle>Back to backlog</Btn>
          )}
        </div>
        <div style={{ ...styles.actions, alignItems: "center" }}>
          <span style={styles.muted}>Or set it to</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as OutreachStatus)} style={{ ...styles.input, width: "auto", margin: 0 }}>
            {STATUSES.filter((st) => st !== "rejected").map((st) => (
              <option key={st} value={st}>
                {STATUS_LABEL[st] ?? st}
              </option>
            ))}
          </select>
          <Btn onClick={() => act(p.id, "set_status", { status })} disabled={busy || status === p.status}>
            Set
          </Btn>
        </div>

        <h3 style={styles.h3}>How the score was worked out</h3>
        {p.score_reasons ? (
          <div style={styles.breakdown}>
            <ScoreBreakdown p={p} />
          </div>
        ) : (
          <p style={styles.muted}>Only prospects waiting to be contacted are scored.</p>
        )}
        {(p.fit_note || p.status_reason) && (
          <>
            <h3 style={styles.h3}>Notes from the research</h3>
            {p.fit_note && <p style={styles.meta}>{p.fit_note}</p>}
            {p.status_reason && <p style={styles.reasons}>{p.status_reason}</p>}
          </>
        )}
        <p style={styles.reasons}>
          Source: {p.source}. Added {fmtDate(p.created_at)}.
        </p>
      </div>

      <div>
        <h3 style={styles.h3}>Details</h3>
        {input("Site name", "title")}
        {input("Contact name", "contact_name")}
        {input("Contact email", "contact_email")}
        {input("Contact page / form", "contact_url")}
        {input("Our page to pitch", "fp_page", "/coaching/...")}
        <label style={styles.label}>
          Angle / what you pitched
          <textarea value={f.angle} onChange={set("angle")} style={styles.textarea} rows={3} />
        </label>
        <label style={styles.label}>
          Notes
          <textarea value={f.notes} onChange={set("notes")} style={styles.textarea} rows={4} />
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>{input("Fit (0-10)", "fit")}</div>
          <div style={{ flex: 1 }}>{input("Domain score (DA/DR)", "da")}</div>
        </div>
        {input("Live link (once won)", "won_link_url", "https://...")}
        <div style={styles.actions}>
          <Btn onClick={saveFields} disabled={busy}>
            Save details
          </Btn>
        </div>
      </div>
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
  body: { padding: "4px 16px" },
  addButton: { background: "#e8b04b", color: "#1a1410", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  tableWrap: { width: "100%", overflowX: "auto", border: "1px solid #3a2c1d", borderRadius: 10 },
  table: { width: "100%", minWidth: 980, borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 12px", color: "#9c8a72", fontWeight: 600, fontSize: 12, borderBottom: "1px solid #3a2c1d", background: "#241b14", whiteSpace: "nowrap" },
  tr: { cursor: "pointer", borderBottom: "1px solid #2e241a" },
  trOpen: { background: "#2a2017" },
  td: { padding: "10px 12px", verticalAlign: "top", color: "#f0e6d2", overflowWrap: "anywhere" },
  tdNowrap: { padding: "10px 12px", verticalAlign: "top", color: "#f0e6d2", whiteSpace: "nowrap" },
  detailCell: { padding: 16, background: "#211912", borderBottom: "1px solid #3a2c1d", cursor: "default" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 },
  h3: { fontSize: 13, color: "#e8b04b", margin: "14px 0 6px", textTransform: "uppercase", letterSpacing: 0.4 },
  scoreBadge: { display: "inline-block", minWidth: 34, textAlign: "center", background: "#3a2c1d", color: "#e8b04b", fontWeight: 700, borderRadius: 6, padding: "3px 6px", cursor: "help" },
  tooltip: { position: "fixed", zIndex: 50, width: 340, maxHeight: 320, overflowY: "auto", background: "#120d09", border: "1px solid #3a2c1d", borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.45, color: "#f0e6d2", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" },
  breakdown: { background: "#1a1410", border: "1px solid #3a2c1d", borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.45 },
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
