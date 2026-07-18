import { NextResponse } from "next/server";

// RFC 8414 authorization server metadata. This site acts as its own (very
// minimal) authorization server for the one MCP client (claude.ai's custom
// connector) - see app/authorize/route.ts (authorization_code + PKCE) and
// app/api/oauth/token/route.ts (token exchange, also accepts
// client_credentials as a fallback).
export async function GET() {
  const issuer = "https://www.footballparent.co.uk";
  return NextResponse.json({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    grant_types_supported: ["authorization_code", "client_credentials"],
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
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
