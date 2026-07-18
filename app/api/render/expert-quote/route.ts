import { NextRequest, NextResponse } from "next/server";
import { renderExpertQuoteSlidePNG } from "@/lib/renderers/expert-quote-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSafeImgSrc(v: unknown): v is string {
  return typeof v === "string" && (v.startsWith("data:") || /^https?:\/\//.test(v));
}

// Body shape mirrors what the browser tool already holds in state: slide
// {type,i}, data (the builder's full field set), plus logoSrc/bioSrc since
// those are usually data: URIs (uploaded files) too large to want duplicated
// inside `data` on every call.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { slide, data, logoSrc, bioSrc } = (body ?? {}) as Record<string, unknown>;

  if (!slide || typeof slide !== "object") {
    return NextResponse.json({ error: "slide is required" }, { status: 400 });
  }
  const kind = (slide as { type?: unknown }).type;
  if (kind !== "cover" && kind !== "bio" && kind !== "qa" && kind !== "quote" && kind !== "cta") {
    return NextResponse.json({ error: "slide.type must be cover, bio, qa, quote or cta" }, { status: 400 });
  }
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "data is required" }, { status: 400 });
  }
  if (logoSrc != null && !isSafeImgSrc(logoSrc)) {
    return NextResponse.json({ error: "logoSrc must be a data: URI or an http(s) URL" }, { status: 400 });
  }
  if (bioSrc != null && !isSafeImgSrc(bioSrc)) {
    return NextResponse.json({ error: "bioSrc must be a data: URI or an http(s) URL" }, { status: 400 });
  }

  try {
    const qas = Array.isArray((data as { qas?: unknown }).qas) ? (data as { qas: unknown[] }).qas : [];
    const png = await renderExpertQuoteSlidePNG(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slide as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { ...(data as Record<string, unknown>), qas } as any,
      typeof logoSrc === "string" ? logoSrc : null,
      typeof bioSrc === "string" ? bioSrc : null
    );
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
