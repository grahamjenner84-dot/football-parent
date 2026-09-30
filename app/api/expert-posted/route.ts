import { NextResponse } from "next/server";
import {
  getPostedExpertPosts,
  setExpertPostPosted,
} from "@/lib/supabase/expert-posted";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected by proxy.ts (added to its matcher): the Expert Opinion builder's
// "Mark as posted" marks, shared across Graham's devices. The builder falls
// back to localStorage when this returns 401 (not signed in to /admin).

export async function GET() {
  try {
    return NextResponse.json({ posted: await getPostedExpertPosts() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Body: { id: "paul-barry-category-1", posted: "2026-09-30" } to mark,
// { id, posted: null } to unmark.
export async function POST(req: Request) {
  let body: { id?: unknown; posted?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const posted = body.posted === null ? null : typeof body.posted === "string" ? body.posted : undefined;
  if (!ID_RE.test(id) || posted === undefined || (posted !== null && !DATE_RE.test(posted))) {
    return NextResponse.json({ error: "Expected { id, posted: 'YYYY-MM-DD' | null }" }, { status: 400 });
  }
  try {
    await setExpertPostPosted(id, posted);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
