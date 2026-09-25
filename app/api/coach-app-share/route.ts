import { NextResponse } from "next/server";
import { logCoachAppShare, SHARE_METHODS, type ShareMethod } from "@/lib/supabase/coach-app-shares";
import { isKnownBot } from "@/lib/user-agent-bots";
import { ADMIN_SESSION_COOKIE, NO_TRACK_COOKIE, hasAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PATH_LENGTH = 300;
const MAX_UA_LENGTH = 500;

// Only the share banner's own variants: anything else is somebody posting
// made-up rows, not the button.
const VARIANT_PATTERN = /^(dark|light)-share-(article|home|category)$/;

// Public endpoint, called by app/components/CoachAppShareButton.tsx. Same
// posture as /api/partner-click: no admin auth, not consent-gated (the row is
// anonymous, see the coach_app_shares migration), Graham's own devices and
// self-declared bots dropped, per-path flood guard inside logCoachAppShare.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const path =
      typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, MAX_PATH_LENGTH) : null;
    const variant = typeof body.variant === "string" && VARIANT_PATTERN.test(body.variant) ? body.variant : null;
    const method = SHARE_METHODS.includes(body.method) ? (body.method as ShareMethod) : null;

    if (!path || !variant || !method) {
      return NextResponse.json({ error: "path, variant and method are required" }, { status: 400 });
    }

    const userAgent =
      typeof req.headers.get("user-agent") === "string"
        ? (req.headers.get("user-agent") as string).slice(0, MAX_UA_LENGTH)
        : null;

    const cookieParts = (req.headers.get("cookie") ?? "").split(";").map((part) => part.trim());
    const sessionValue = cookieParts
      .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
      ?.slice(ADMIN_SESSION_COOKIE.length + 1);
    const noTrack = cookieParts.some((part) => part === `${NO_TRACK_COOKIE}=1`);

    if (noTrack || hasAdminSession(sessionValue)) {
      return NextResponse.json({ ok: true });
    }

    if (!isKnownBot(userAgent)) {
      await logCoachAppShare(path, variant, method, userAgent);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
