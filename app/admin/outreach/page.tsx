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
  last_contact_at: string | null;
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

type Tab = "week" | "backlog" | "noReply" | "discussion" | "rejected" | "won" | "parked";

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

        {tab === "backlog" && (
          <>
            <p style={styles.muted}>Everyone not contacted yet, best first. The Monday run drafts from the top of this list.</p>
            <ReviewedBacklogs onLoaded={load} />
            <AddProspect onAdded={load} />
            <ImportHistory onImported={load} />
            {groups.backlog.map((p) => (
              <div key={p.id} style={styles.card}>
                <CardHead p={p} />
                {p.angle && <p style={styles.meta}>Angle: {p.angle}</p>}
                {p.fit_note && <p style={styles.meta}>{p.fit_note}</p>}
                {p.notes && <p style={styles.meta}>{p.notes}</p>}
                <p style={styles.reasons}>{p.score_reasons}</p>
                <div style={styles.actions}>
                  <Btn onClick={() => act(p.id, "skip")} disabled={busy === p.id} subtle>Not a good lead</Btn>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "noReply" && (
          <>
            <p style={styles.muted}>Emailed, nothing back yet. Chase-ups fall due in This week; after the second chase they stay here as no reply.</p>
            {groups.noReply.map((p) => (
              <ContactCard key={p.id} p={p}>
                <Btn onClick={() => act(p.id, "replied")} disabled={busy === p.id}>They replied</Btn>
                <WonButton onWon={(url) => act(p.id, "won", { url })} disabled={busy === p.id} />
                <Btn onClick={() => act(p.id, "lost")} disabled={busy === p.id} subtle>Said no</Btn>
                {p.status === "no_reply" && (
                  <Btn onClick={() => act(p.id, "restore")} disabled={busy === p.id} subtle>Try again later</Btn>
                )}
              </ContactCard>
            ))}
          </>
        )}

        {tab === "discussion" && (
          <>
            <p style={styles.muted}>They replied and it looks promising. Mark won once the link is live.</p>
            {groups.discussion.map((p) => (
              <ContactCard key={p.id} p={p}>
                <WonButton onWon={(url) => act(p.id, "won", { url })} disabled={busy === p.id} />
                <Btn onClick={() => act(p.id, "lost")} disabled={busy === p.id} subtle>Fell through</Btn>
              </ContactCard>
            ))}
          </>
        )}

        {tab === "rejected" && (
          <>
            <p style={styles.muted}>{"Said no, or went nowhere after replying. Kept so they aren't pitched again."}</p>
            {groups.rejected.map((p) => (
              <ContactCard key={p.id} p={p}>
                <Btn onClick={() => act(p.id, "replied")} disabled={busy === p.id} subtle>Back in discussion</Btn>
              </ContactCard>
            ))}
          </>
        )}

        {tab === "won" && (
          <>
            <p style={styles.muted}>Links that are live.</p>
            {groups.won.map((p) => (
              <ContactCard key={p.id} p={p}>
                {p.won_link_url ? (
                  <a href={p.won_link_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                    {p.won_link_url}
                  </a>
                ) : (
                  <WonButton label="Add the live link" onWon={(url) => act(p.id, "won", { url })} disabled={busy === p.id} />
                )}
              </ContactCard>
            ))}
          </>
        )}

        {tab === "parked" && (
          <>
            <p style={styles.muted}>{"Not good leads: ones you've ruled out, plus FA, homepage and partner pages the filter set aside as partnership-only."}</p>
            {groups.parked.map((p) => (
              <div key={p.id} style={styles.card}>
                <CardHead p={p} />
                <p style={styles.meta}>{p.status === "skipped" ? "You marked this as not a good lead." : p.status_reason}</p>
                <div style={styles.actions}>
                  <Btn onClick={() => act(p.id, "restore")} disabled={busy === p.id} subtle>Move to backlog</Btn>
                </div>
              </div>
            ))}
          </>
        )}
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

// One card layout for every "Emailed" tab: who, when, what was pitched,
// the notes, then the tab's own buttons.
function ContactCard({ p, children }: { p: Prospect; children: ReactNode }) {
  const last = p.last_contact_at && p.last_contact_at !== p.sent_at ? `, last contact ${fmtDate(p.last_contact_at)}` : "";
  return (
    <div style={styles.card}>
      <CardHead p={p} />
      <p style={styles.meta}>
        {p.sent_at ? `Emailed ${fmtDate(p.sent_at)}${last}` : "Date not recorded"}
        {p.contact_email ? ` · ${p.contact_email}` : ""}
        {AWAITING.includes(p.status) && p.next_action_at ? ` · next chase ${fmtDate(p.next_action_at)}` : ""}
      </p>
      {p.angle && <p style={styles.meta}>Pitched: {p.angle}</p>}
      {p.notes && <p style={styles.reasons}>{p.notes}</p>}
      <div style={styles.actions}>{children}</div>
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
  const [files, setFiles] = useState<{ name: string; rows: number; loaded: number }[] | null>(null);
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
      const n = (f: (x: (typeof r)[number]) => boolean) => r.filter(f).length;
      const known = r.filter((x) => x.outcome === "domain_known" && x.existing).map((x) => describeKnown(x.existing));
      setMsg(
        `Loaded ${name}: ${n((x) => x.outcome === "added" && x.status === "backlog")} to the backlog, ` +
          `${n((x) => x.outcome === "added" && x.status === "parked")} parked, ` +
          `${n((x) => x.outcome === "added" && x.status === "rejected")} rejected by the gate, ` +
          `${n((x) => x.outcome === "duplicate")} already loaded` +
          (known.length ? `, ${known.length} already on your list: ${known.join("; ")}` : "") +
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

  if (!files?.length && !msg) return null;
  return (
    <div style={styles.card}>
      <p style={styles.meta}>{"Reviewed backlogs from link building. Import your past outreach first, so anyone you've already emailed is caught."}</p>
      {files?.map((f) => (
        <div key={f.name} style={{ ...styles.actions, alignItems: "center" }}>
          <span style={{ ...styles.meta, flex: 1 }}>
            {f.name.replace("outreach-backlog-", "").replace(".json", "")}: {f.rows} prospects{f.loaded ? `, ${f.loaded} already loaded` : ""}
          </span>
          {f.loaded < f.rows && (
            <Btn onClick={() => loadFile(f.name)} disabled={working !== null}>
              {working === f.name ? "Loading..." : `Load ${f.rows - f.loaded}`}
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
function ImportHistory({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
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
