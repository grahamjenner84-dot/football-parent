import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/search-index";

// Route Handlers aren't cached by default in this Next.js version (see
// node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md)
// - force-static so this prerenders once at build time instead of doing an
// fs read of content/ on every request.
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(getSearchIndex());
}
