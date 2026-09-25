import { NextResponse } from "next/server";
import { logCoachAppSignup } from "@/lib/supabase/coach-app-funnel";
import { isKnownBot } from "@/lib/user-agent-bots";
import { ADMIN_SESSION_COOKIE, NO_TRACK_COOKIE, hasAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FIELD = 300;
const MAX_UA_LENGTH = 500;

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, MAX_FIELD) : null;
}

// Public endpoint, called once per new account by the Coach App
// (src/data/signupEvent.ts in the coach-app repo), which is served from this
// same origin through the vercel.json rewrite. Anonymous by construction:
// the body has no user id, email or name, and this route would drop one if
// it were sent. See the coach_app_signups migration for why this exists.
//
// Same exclusions as the other public tracking endpoints: Graham's own
// devices (admin session or no-track cookie) and self-declared bots.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const userAgent = str(req.headers.get("user-agent"))?.slice(0, MAX_UA_LENGTH) ?? null;

    const cookieParts = (req.headers.get("cookie") ?? "").split(";").map((part) => part.trim());
    const sessionValue = cookieParts
      .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
      ?.slice(ADMIN_SESSION_COOKIE.length + 1);
    const noTrack = cookieParts.some((part) => part === `${NO_TRACK_COOKIE}=1`);

    if (noTrack || hasAdminSession(sessionValue) || isKnownBot(userAgent)) {
      return NextResponse.json({ ok: true });
    }

    await logCoachAppSignup(
      {
        attributed: body.attributed === true,
        landingPath: str(body.landingPath),
        entryPath: str(body.entryPath),
        entrySourceGroup: str(body.entrySourceGroup),
        banner: str(body.banner),
        utmSource: str(body.utmSource),
        utmMedium: str(body.utmMedium),
        utmCampaign: str(body.utmCampaign),
        hadGclid: body.hadGclid === true,
      },
      userAgent
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
