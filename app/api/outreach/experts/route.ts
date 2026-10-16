import { NextRequest, NextResponse } from "next/server";
import { addExpert, deleteExpert, listExperts, updateExpert } from "@/lib/supabase/outreach-experts";

// Admin-only (guarded in proxy.ts by /api/outreach/:path*). Backs the
// "Experts to approach" tab on /admin/outreach.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(err: unknown, status = 500) {
  return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status });
}

export async function GET() {
  try {
    return NextResponse.json({ experts: await listExperts() });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body?.name || !String(body.name).trim()) return fail("name is required", 400);
    return NextResponse.json({ expert: await addExpert(body) });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id?: number; fields?: Record<string, unknown> };
    if (!body?.id) return fail("id is required", 400);
    return NextResponse.json({ expert: await updateExpert(body.id, body.fields ?? {}) });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) return fail("id is required", 400);
    await deleteExpert(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
