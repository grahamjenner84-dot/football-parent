import { NextRequest, NextResponse } from "next/server";
import { logConsentEvent, type ConsentAction } from "@/lib/supabase/cookie-consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ACTIONS: ConsentAction[] = ["accept_all", "reject_all", "save_preferences"];

// Public endpoint, called from the cookie banner on every page. Not gated by
// proxy.ts admin auth - it only ever writes an anonymous action+boolean, see
// the comment on the cookie_consent_events migration for why that's fine to
// log independently of the analytics consent choice itself.
export async function POST(req: NextRequest) {
  let body: { action?: unknown; analyticsGranted?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { action, analyticsGranted } = body;

  if (
    typeof action !== "string" ||
    !VALID_ACTIONS.includes(action as ConsentAction) ||
    typeof analyticsGranted !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await logConsentEvent(action as ConsentAction, analyticsGranted);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
