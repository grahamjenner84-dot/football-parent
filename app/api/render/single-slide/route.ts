import { NextRequest, NextResponse } from "next/server";
import { renderSingleSlidePNG } from "@/lib/renderers/single-slide-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { setup, punch, layout, platform } = (body ?? {}) as Record<string, unknown>;

  if (typeof punch !== "string" || !punch.trim()) {
    return NextResponse.json({ error: "punch (the punchline) is required" }, { status: 400 });
  }

  try {
    const png = renderSingleSlidePNG(
      {
        setup: typeof setup === "string" ? setup : "",
        punch,
        layout: layout === "C" ? "C" : "A",
      },
      platform === "tiktok" ? "tiktok" : "ig"
    );
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
