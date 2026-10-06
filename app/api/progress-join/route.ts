import { NextResponse } from "next/server";
import { logProgressJoin } from "@/lib/supabase/progress-funnel";
import { isKnownBot } from "@/lib/user-agent-bots";
import { isOwnerRequest } from "@/lib/owner-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FIELD = 300;
const MAX_UA_LENGTH = 500;

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, MAX_FIELD) : null;
}

// Public endpoint, called once per sign-in link sent from the join form on
// /progress (app/components/ProgressJoinForm.tsx). Anonymous by
// construction: the body has no email, user id or name, and this route would
// drop one if it were sent. See the progress_pipeline migration.
//
// Same exclusions as the other public tracking endpoints: Graham's own
// devices (admin session or no-track cookie) and self-declared bots.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userAgent = str(req.headers.get("user-agent"))?.slice(0, MAX_UA_LENGTH) ?? null;

    if (await isOwnerRequest(req) || isKnownBot(userAgent)) {
      return NextResponse.json({ ok: true });
    }

    await logProgressJoin(
      {
        form: str(body.form),
        entryPath: str(body.entryPath),
        entrySourceGroup: str(body.sourceGroup),
        banner: str(body.banner),
        utmSource: str(body.utmSource),
        utmMedium: str(body.utmMedium),
        utmCampaign: str(body.utmCampaign),
        hadGclid: body.hadGclid === true,
        marketingOptIn: body.marketingOptIn === true,
      },
      userAgent
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
