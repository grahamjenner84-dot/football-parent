import { NextRequest, NextResponse } from "next/server";
import { renderReelSlidePNG, Core } from "@/lib/renderers/reel-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Body shape mirrors what the browser tool already computes before calling
// Core.drawSlide: the resolved layout/style for the slide's template (via
// Core.resolveLayout/resolveStyle), not a template ID — this route has no
// server-side template registry, templates live in the client's localStorage
// plus Supabase-hosted background images.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { slide, reel, brand, layout, style, bgUrl } = (body ?? {}) as Record<string, unknown>;

  if (!slide || typeof slide !== "object") {
    return NextResponse.json({ error: "slide is required" }, { status: 400 });
  }
  const kind = (slide as { kind?: unknown }).kind;
  if (kind !== "hook" && kind !== "content" && kind !== "cta" && kind !== "quote") {
    return NextResponse.json({ error: "slide.kind must be hook, content, cta or quote" }, { status: 400 });
  }
  if (!reel || typeof reel !== "object" || !Array.isArray((reel as { slides?: unknown }).slides)) {
    return NextResponse.json({ error: "reel.slides array is required" }, { status: 400 });
  }
  if (typeof bgUrl === "string" && bgUrl && !/^https?:\/\//.test(bgUrl)) {
    return NextResponse.json({ error: "bgUrl must be an http(s) URL" }, { status: 400 });
  }

  try {
    const resolvedLayout = (layout && typeof layout === "object")
      ? layout
      : Core.resolveLayout(kind, null);
    const resolvedStyle = typeof style === "string" ? style : "classic";
    const png = await renderReelSlidePNG(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slide as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reel as any,
      (brand && typeof brand === "object" ? brand : {}) as Record<string, unknown> as never,
      resolvedLayout as never,
      resolvedStyle,
      typeof bgUrl === "string" ? bgUrl : null
    );
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
