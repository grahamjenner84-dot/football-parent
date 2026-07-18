import { NextRequest, NextResponse } from "next/server";
import { uploadReelTemplateAsset } from "@/lib/supabase/reel-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const ALLOWED_SLOTS = new Set(["hook", "content", "cta"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const templateId = form.get("templateId");
  const slot = form.get("slot");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (typeof templateId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(templateId)) {
    return NextResponse.json({ error: "templateId is required and must be alphanumeric/-/_" }, { status: 400 });
  }
  if (typeof slot !== "string" || !ALLOWED_SLOTS.has(slot)) {
    return NextResponse.json({ error: "slot must be one of hook, content, cta" }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "file must be image/png, image/jpeg or image/webp" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file exceeds 10MB limit" }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const storagePath = `${templateId}/${slot}.${ext}`;
    const url = await uploadReelTemplateAsset(storagePath, bytes, file.type);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
