import { createClient } from "@supabase/supabase-js";
import { assessProspect, hostOf, type ProspectCandidate, type ProspectType } from "@/lib/outreach/quality";
import { scoreProspect } from "@/lib/outreach/score";
import { applyAction, MONTHLY_LINK_TARGET, type OutreachAction, type OutreachStatus } from "@/lib/outreach/lifecycle";

// Server-only client using the service role key, same pattern as
// lib/supabase/partner-clicks.ts - never import from client code. Points at
// the football-parent-social project, never the Coach App one.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface OutreachProspect {
  id: number;
  url: string;
  domain: string;
  title: string | null;
  prospect_type: ProspectType;
  is_uk: boolean | null;
  source: string;
  authority: number | null;
  fit: number | null;
  fit_note: string | null;
  fp_page: string | null;
  angle: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_url: string | null;
  status: OutreachStatus;
  status_reason: string | null;
  score: number;
  score_reasons: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  chase_line: string | null;
  drafted_at: string | null;
  sent_at: string | null;
  last_contact_at: string | null;
  next_action_at: string | null;
  chase_count: number;
  won_link_url: string | null;
  link_checked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewProspect extends ProspectCandidate {
  source: string;
  authority?: number | null;
  fit?: number | null;
  fit_note?: string | null;
  fp_page?: string | null;
  angle?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_url?: string | null;
  notes?: string | null;
}

export interface AddResult {
  url: string;
  outcome: "added" | "duplicate" | "domain_active";
  status?: OutreachStatus;
  reasons?: string[];
}

// Statuses that mean we're already talking to (or about to talk to) a
// domain, so a second page on the same site must not get its own email.
const ACTIVE: OutreachStatus[] = ["drafted", "sent", "chase_1", "chase_2", "replied"];

// Runs the quality gate and stores the result either way: a rejected row is
// kept (status 'rejected') so discovery never proposes the same page again.
export async function addProspects(items: NewProspect[]): Promise<AddResult[]> {
  const supabase = adminClient();
  const results: AddResult[] = [];

  for (const item of items) {
    const { data: existing } = await supabase.from("outreach_prospects").select("id").eq("url", item.url).maybeSingle();
    if (existing) {
      results.push({ url: item.url, outcome: "duplicate" });
      continue;
    }

    const q = assessProspect(item);
    const status: OutreachStatus = q.verdict === "ok" ? "backlog" : q.verdict === "parked" ? "parked" : "rejected";
    const reasons = [...q.reasons];

    if (status === "backlog") {
      const { count } = await supabase
        .from("outreach_prospects")
        .select("id", { count: "exact", head: true })
        .eq("domain", q.domain)
        .in("status", ACTIVE);
      if ((count ?? 0) > 0) {
        results.push({ url: item.url, outcome: "domain_active" });
        continue;
      }
    }

    const s = scoreProspect({
      type: q.type,
      isUk: q.isUk,
      authority: item.authority,
      fit: item.fit,
      fpPage: item.fp_page,
      hasContact: Boolean(item.contact_email || item.contact_url),
      createdAt: new Date().toISOString(),
    });

    const { error } = await supabase.from("outreach_prospects").insert({
      url: item.url,
      domain: q.domain || hostOf(item.url),
      title: item.title ?? null,
      prospect_type: q.type,
      is_uk: q.isUk,
      source: item.source,
      authority: item.authority ?? null,
      fit: item.fit ?? null,
      fit_note: item.fit_note ?? item.context ?? null,
      fp_page: item.fp_page ?? null,
      angle: item.angle ?? null,
      contact_name: item.contact_name ?? null,
      contact_email: item.contact_email ?? null,
      contact_url: item.contact_url ?? null,
      notes: item.notes ?? null,
      status,
      status_reason: status === "backlog" ? (reasons.join("; ") || null) : reasons.join("; "),
      score: s.score,
      score_reasons: s.reasons.join(", "),
    });
    if (error) throw new Error(`insert ${item.url}: ${error.message}`);
    results.push({ url: item.url, outcome: "added", status, reasons });
  }
  return results;
}

export async function listProspects(statuses?: OutreachStatus[], limit = 1000): Promise<OutreachProspect[]> {
  const supabase = adminClient();
  let q = supabase.from("outreach_prospects").select("*").order("score", { ascending: false }).limit(limit);
  if (statuses?.length) q = q.in("status", statuses);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as OutreachProspect[];
}

export async function getProspect(id: number): Promise<OutreachProspect> {
  const supabase = adminClient();
  const { data, error } = await supabase.from("outreach_prospects").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as OutreachProspect;
}

async function logEvent(prospectId: number, kind: string, detail?: string | null) {
  const supabase = adminClient();
  await supabase.from("outreach_events").insert({ prospect_id: prospectId, kind, detail: detail ?? null });
}

export async function updateProspectFields(id: number, fields: Partial<OutreachProspect>): Promise<void> {
  const supabase = adminClient();
  const { error } = await supabase
    .from("outreach_prospects")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export interface DraftInput {
  id: number;
  subject: string;
  body: string;
  chase_line?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_url?: string | null;
  fp_page?: string | null;
  angle?: string | null;
  fit?: number | null;
  fit_note?: string | null;
}

export async function saveDraft(d: DraftInput): Promise<void> {
  const current = await getProspect(d.id);
  const fields: Partial<OutreachProspect> = {
    draft_subject: d.subject,
    draft_body: d.body,
  };
  for (const k of ["chase_line", "contact_name", "contact_email", "contact_url", "fp_page", "angle", "fit", "fit_note"] as const) {
    if (d[k] !== undefined) (fields as Record<string, unknown>)[k] = d[k];
  }
  // A draft saved against a backlog prospect promotes it into this week's
  // queue; editing an already-drafted or sent one just updates the copy.
  if (current.status === "backlog") {
    fields.status = "drafted";
    fields.drafted_at = new Date().toISOString();
  }
  await updateProspectFields(d.id, fields);
  if (current.status === "backlog") await logEvent(d.id, "drafted");
}

export async function applyProspectAction(id: number, action: OutreachAction): Promise<OutreachProspect> {
  const current = await getProspect(id);
  const t = applyAction(current, action);
  await updateProspectFields(id, t as Partial<OutreachProspect>);
  await logEvent(id, action.action, "url" in action ? action.url ?? null : null);
  return getProspect(id);
}

export async function recordLinkCheck(id: number, foundUrl: string | null): Promise<void> {
  const now = new Date().toISOString();
  if (foundUrl) {
    await updateProspectFields(id, { status: "won", won_link_url: foundUrl, next_action_at: null, link_checked_at: now });
    await logEvent(id, "link_found", foundUrl);
  } else {
    await updateProspectFields(id, { link_checked_at: now });
  }
}

// Recompute every open prospect's score. Skip rate per type comes from
// Graham's own skips, so the ranking bends towards what he actually sends.
export async function rescoreAll(now = new Date()): Promise<number> {
  const all = await listProspects(undefined, 5000);
  const decided = all.filter((p) => ["skipped", "sent", "chase_1", "chase_2", "replied", "won", "lost", "no_reply"].includes(p.status));
  const skipRate = new Map<string, number>();
  for (const type of new Set(decided.map((p) => p.prospect_type))) {
    const ofType = decided.filter((p) => p.prospect_type === type);
    if (ofType.length >= 4) skipRate.set(type, ofType.filter((p) => p.status === "skipped").length / ofType.length);
  }

  let n = 0;
  for (const p of all) {
    if (p.status !== "backlog" && p.status !== "drafted") continue;
    const s = scoreProspect({
      type: p.prospect_type,
      isUk: p.is_uk,
      authority: p.authority,
      fit: p.fit,
      fpPage: p.fp_page,
      hasContact: Boolean(p.contact_email || p.contact_url),
      createdAt: p.created_at,
      skipRate: skipRate.get(p.prospect_type),
      now,
    });
    if (s.score !== p.score || s.reasons.join(", ") !== p.score_reasons) {
      await updateProspectFields(p.id, { score: s.score, score_reasons: s.reasons.join(", ") });
      n++;
    }
  }
  return n;
}

export interface OutreachStats {
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

export async function getStats(now = new Date()): Promise<OutreachStats> {
  const supabase = adminClient();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  weekStart.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const { data: events, error } = await supabase
    .from("outreach_events")
    .select("kind, created_at, prospect_id")
    .gte("created_at", new Date(now.getTime() - 400 * 86_400_000).toISOString())
    .limit(20000);
  if (error) throw new Error(error.message);
  const ev = events ?? [];
  const since = (d: Date) => ev.filter((e) => new Date(e.created_at) >= d);
  const count = (list: typeof ev, kinds: string[]) => list.filter((e) => kinds.includes(e.kind)).length;

  const sentAllTime = count(ev, ["mark_sent"]);
  const repliedProspects = new Set(ev.filter((e) => ["replied", "won", "lost", "link_found"].includes(e.kind)).map((e) => e.prospect_id));

  const { count: backlog } = await supabase
    .from("outreach_prospects")
    .select("id", { count: "exact", head: true })
    .eq("status", "backlog");

  return {
    sentThisWeek: count(since(weekStart), ["mark_sent"]),
    sentThisMonth: count(since(monthStart), ["mark_sent"]),
    chasesThisWeek: count(since(weekStart), ["mark_chased"]),
    repliesThisMonth: count(since(monthStart), ["replied"]),
    wonThisMonth: count(since(monthStart), ["won", "link_found"]),
    wonAllTime: count(ev, ["won", "link_found"]),
    sentAllTime,
    replyRate: sentAllTime ? repliedProspects.size / sentAllTime : null,
    monthlyTarget: MONTHLY_LINK_TARGET,
    backlog: backlog ?? 0,
  };
}
