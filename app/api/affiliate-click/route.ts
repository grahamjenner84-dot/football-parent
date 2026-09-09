import { NextResponse } from "next/server";
import { logAffiliateClick } from "@/lib/supabase/affiliate-clicks";
import { isAffiliateLink } from "@/lib/affiliate";
import { isKnownBot } from "@/lib/user-agent-bots";
import { ADMIN_SESSION_COOKIE, NO_TRACK_COOKIE, hasAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PATH_LENGTH = 300;
const MAX_HREF_LENGTH = 500;
const MAX_HOST_LENGTH = 255;
const MAX_LINK_TEXT_LENGTH = 200;
const MAX_PLACEMENT_LENGTH = 64;
const MAX_UA_LENGTH = 500;

function cleanString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

// Public endpoint, called by app/components/AffiliateClickTracker.tsx when a
// reader clicks an outbound affiliate link. Mirrors POST /api/page-view: no
// admin auth, not gated on cookie consent (the row is anonymous - see the
// migration comment on affiliate_clicks), Graham's own devices and
// self-declared bots dropped, and a per-path flood guard inside
// logAffiliateClick since there is no rate limit here.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = cleanString(body.path, MAX_PATH_LENGTH);
    const href = cleanString(body.href, MAX_HREF_LENGTH);

    if (!path || !href) {
      return NextResponse.json({ error: "path and href are required" }, { status: 400 });
    }

    // Only destinations this site actually monetises get logged. Without
    // this the endpoint is an open write for any URL a caller invents, and
    // the report becomes a list of whatever somebody chose to POST.
    if (!isAffiliateLink(href)) {
      return NextResponse.json({ error: "href is not an affiliate link" }, { status: 400 });
    }

    const merchant = new URL(href).hostname.toLowerCase().slice(0, MAX_HOST_LENGTH);
    const userAgent = cleanString(req.headers.get("user-agent"), MAX_UA_LENGTH);

    // Same owner-device exclusion as the page-view endpoint, and for the
    // same reason: at this click volume a handful of Graham's own checks
    // that a link still works would dominate the numbers it produces.
    const cookieHeader = req.headers.get("cookie") ?? "";
    const cookieParts = cookieHeader.split(";").map((part) => part.trim());
    const sessionValue = cookieParts
      .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
      ?.slice(ADMIN_SESSION_COOKIE.length + 1);
    const noTrack = cookieParts.some((part) => part === `${NO_TRACK_COOKIE}=1`);

    if (noTrack || hasAdminSession(sessionValue)) {
      return NextResponse.json({ ok: true });
    }

    if (!isKnownBot(userAgent)) {
      await logAffiliateClick(path, href, merchant, {
        linkText: cleanString(body.linkText, MAX_LINK_TEXT_LENGTH),
        placement: cleanString(body.placement, MAX_PLACEMENT_LENGTH),
        userAgent,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
