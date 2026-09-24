import { NextRequest, NextResponse } from "next/server";
import {
  addProspects,
  applyProspectAction,
  getStats,
  listProspects,
  saveDraft,
  updateProspectFields,
} from "@/lib/supabase/outreach";
import type { OutreachAction } from "@/lib/outreach/lifecycle";

// Admin-only (guarded in proxy.ts). Backs /admin/outreach.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set(["mark_sent", "mark_chased", "replied", "won", "lost", "no_reply", "skip", "park", "restore"]);

function fail(err: unknown, status = 500) {
  return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status });
}

export async function GET() {
  try {
    const [prospects, stats] = await Promise.all([
      listProspects(["backlog", "drafted", "sent", "chase_1", "chase_2", "replied", "won", "parked"], 1000),
      getStats(),
    ]);
    return NextResponse.json({ prospects, stats });
  } catch (err) {
    return fail(err);
  }
}

// Manual add: a contact met at a tournament, a site spotted while browsing.
// Goes through the same quality gate as discovery.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      url?: string;
      notes?: string;
      contact_email?: string;
      fp_page?: string;
      angle?: string;
      domain_score?: number | string;
    };
    if (!body.url) return fail("url is required", 400);

    // Hand-entered domain score is DA/DR style (0-100). The backlog scoring
    // in lib/outreach/score.ts uses DataForSEO's 0-1000 domain rank, so scale
    // it to that range. The two metrics aren't identical, but for ranking
    // the backlog this is close enough, and the note keeps the original.
    const raw = body.domain_score === undefined || body.domain_score === "" ? null : Number(body.domain_score);
    if (raw !== null && (!Number.isFinite(raw) || raw < 0 || raw > 100)) return fail("domain score must be 0-100", 400);
    const scoreNote = raw !== null ? `Domain score ${raw} (entered by hand)` : null;

    const [res] = await addProspects([
      {
        url: body.url,
        source: "manual",
        notes: [body.notes, scoreNote].filter(Boolean).join("\n") || null,
        contact_email: body.contact_email || null,
        fp_page: body.fp_page || null,
        angle: body.angle || null,
        authority: raw !== null ? Math.round(raw * 10) : null,
      },
    ]);
    return NextResponse.json(res);
  } catch (err) {
    return fail(err);
  }
}

type PatchBody =
  | ({ id: number; kind: "action" } & OutreachAction)
  | { id: number; kind: "draft"; subject: string; body: string; contact_email?: string | null; contact_name?: string | null }
  | { id: number; kind: "notes"; notes: string };

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as PatchBody;
    if (!body?.id) return fail("id is required", 400);

    if (body.kind === "action") {
      if (!ACTIONS.has(body.action)) return fail(`unknown action ${body.action}`, 400);
      const { id, kind: _kind, ...action } = body;
      void _kind;
      return NextResponse.json({ prospect: await applyProspectAction(id, action as OutreachAction) });
    }
    if (body.kind === "draft") {
      await saveDraft({ id: body.id, subject: body.subject, body: body.body, contact_email: body.contact_email, contact_name: body.contact_name });
      return NextResponse.json({ ok: true });
    }
    if (body.kind === "notes") {
      await updateProspectFields(body.id, { notes: body.notes });
      return NextResponse.json({ ok: true });
    }
    return fail("unknown kind", 400);
  } catch (err) {
    return fail(err);
  }
}
