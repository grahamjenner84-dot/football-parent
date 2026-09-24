import { NextResponse } from "next/server";
import { getTopSearches } from "@/lib/supabase/search-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    const dateParam = searchParams.get("date") ?? "";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;
    const stats = await getTopSearches(date ? { date } : { days });
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
