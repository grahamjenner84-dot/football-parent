import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/render-pipeline";
import { getAccountCredentials } from "@/lib/instagram/publish-pipeline";
import { getScheduleSettings, upsertScheduleSettings, ScheduleSettings } from "@/lib/instagram/review-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { accountRowId } = await getAccountCredentials(supabase);
    const settings = await getScheduleSettings(supabase, accountRowId);
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ScheduleSettings>;
    if (!body.postingTime || !/^\d{2}:\d{2}$/.test(body.postingTime)) {
      return NextResponse.json({ error: "postingTime must be \"HH:MM\"" }, { status: 400 });
    }
    if (typeof body.cadenceDays !== "number" || body.cadenceDays <= 0) {
      return NextResponse.json({ error: "cadenceDays must be a positive number" }, { status: 400 });
    }
    if (!body.timezone) {
      return NextResponse.json({ error: "timezone is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { accountRowId } = await getAccountCredentials(supabase);
    const settings: ScheduleSettings = { postingTime: body.postingTime, cadenceDays: body.cadenceDays, timezone: body.timezone };
    await upsertScheduleSettings(supabase, accountRowId, settings);
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
