import { NextRequest, NextResponse } from "next/server";
import { deleteReelTemplateAssets } from "@/lib/supabase/reel-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Removes all uploaded slot images (hook/content/cta) for a template, called
// when the browser tool deletes a custom template or clears a brand.bg slot
// set (templateId="brand-bg").
export async function DELETE(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get("templateId");
  if (!templateId || !/^[a-zA-Z0-9_-]+$/.test(templateId)) {
    return NextResponse.json({ error: "templateId is required and must be alphanumeric/-/_" }, { status: 400 });
  }
  try {
    await deleteReelTemplateAssets(templateId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
