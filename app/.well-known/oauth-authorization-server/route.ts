import { NextResponse } from "next/server";

// RFC 8414 authorization server metadata. This site acts as its own (very
// minimal) authorization server - the only grant it issues is
// client_credentials via /api/oauth/token, for the one MCP client
// (claude.ai's custom connector). See app/api/oauth/token/route.ts.
export async function GET() {
  const issuer = "https://www.footballparent.co.uk";
  return NextResponse.json({
    issuer,
    token_endpoint: `${issuer}/api/oauth/token`,
    grant_types_supported: ["client_credentials"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    response_types_supported: [],
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
