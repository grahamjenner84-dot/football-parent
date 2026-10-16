import { createClient } from "@supabase/supabase-js";

// Experts to approach for E-E-A-T quotes and interviews (outreach_experts,
// migration 20261016120000). Server-only, service role key, same pattern as
// lib/supabase/outreach.ts - never import from client code. Points at the
// football-parent-social project, never the Coach App one.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export const EXPERT_STATUSES = ["to_approach", "contacted", "agreed", "published", "declined"] as const;
export type ExpertStatus = (typeof EXPERT_STATUSES)[number];

export const EXPERT_FIELDS = ["name", "role", "website", "contact", "instagram", "eeat_gap", "fp_pages", "status", "notes"] as const;
export type ExpertField = (typeof EXPERT_FIELDS)[number];

export interface OutreachExpert {
  id: number;
  name: string;
  role: string | null;
  website: string | null;
  contact: string | null;
  instagram: string | null;
  eeat_gap: string | null;
  fp_pages: string | null;
  status: ExpertStatus;
  notes: string | null;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

// "@lgsportpsychology", "lgsportpsychology" or a full instagram.com URL all
// store as the bare handle; the page builds the link.
export function normaliseInstagram(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const fromUrl = v.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  return (fromUrl ? fromUrl[1] : v.replace(/^@/, "")).trim() || null;
}

function clean(fields: Partial<Record<ExpertField, unknown>>): Partial<Record<ExpertField, string | null>> {
  const out: Partial<Record<ExpertField, string | null>> = {};
  for (const k of EXPERT_FIELDS) {
    if (!(k in fields)) continue;
    const v = fields[k];
    const s = v === null || v === undefined ? null : String(v).trim() || null;
    out[k] = k === "instagram" ? normaliseInstagram(s) : s;
  }
  if (out.status && !EXPERT_STATUSES.includes(out.status as ExpertStatus)) throw new Error(`unknown status ${out.status}`);
  if ("name" in out && !out.name) throw new Error("name is required");
  return out;
}

export async function listExperts(): Promise<OutreachExpert[]> {
  const { data, error } = await adminClient().from("outreach_experts").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as OutreachExpert[];
}

export async function addExpert(fields: Partial<Record<ExpertField, unknown>>): Promise<OutreachExpert> {
  const row = clean(fields);
  if (!row.name) throw new Error("name is required");
  const { data, error } = await adminClient().from("outreach_experts").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data as OutreachExpert;
}

export async function updateExpert(id: number, fields: Partial<Record<ExpertField, unknown>>): Promise<OutreachExpert> {
  const row: Record<string, unknown> = { ...clean(fields), updated_at: new Date().toISOString() };
  // First move off "to approach" stamps the date, so the tab can show it.
  if (row.status && row.status !== "to_approach") {
    const { data: cur } = await adminClient().from("outreach_experts").select("contacted_at").eq("id", id).single();
    if (cur && !cur.contacted_at) row.contacted_at = new Date().toISOString();
  }
  const { data, error } = await adminClient().from("outreach_experts").update(row).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as OutreachExpert;
}

export async function deleteExpert(id: number): Promise<void> {
  const { error } = await adminClient().from("outreach_experts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
