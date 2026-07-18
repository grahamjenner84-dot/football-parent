import { NextRequest, NextResponse } from "next/server";

// Minimal OAuth 2.0 client_credentials token endpoint - just enough for
// claude.ai's custom connector "Advanced settings" (Client ID + Client
// Secret) to obtain a bearer token automatically, without a user-facing
// login/consent screen. There's only one client (Graham), so this checks a
// single fixed client_id/client_secret pair against env vars and, if they
// match, hands back the same MCP_ACCESS_TOKEN that app/api/[transport]/
// route.ts already validates - the actual authorization check doesn't
// change, this just gives an OAuth-compliant client an automated way to
// fetch that token instead of it being pasted in manually.

function extractClientCredentials(req: NextRequest, body: URLSearchParams) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep !== -1) {
      return { clientId: decoded.slice(0, sep), clientSecret: decoded.slice(sep + 1) };
    }
  }
  return {
    clientId: body.get("client_id") || undefined,
    clientSecret: body.get("client_secret") || undefined,
  };
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  let body: URLSearchParams;
  if (contentType.includes("application/json")) {
    const json = await req.json().catch(() => ({}));
    body = new URLSearchParams(json as Record<string, string>);
  } else {
    body = new URLSearchParams(await req.text());
  }

  const grantType = body.get("grant_type");
  if (grantType !== "client_credentials") {
    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: "Only client_credentials is supported" },
      { status: 400 }
    );
  }

  const { clientId, clientSecret } = extractClientCredentials(req, body);
  const expectedId = process.env.MCP_CLIENT_ID;
  const expectedSecret = process.env.MCP_CLIENT_SECRET;
  const accessToken = process.env.MCP_ACCESS_TOKEN;

  if (!expectedId || !expectedSecret || !accessToken || clientId !== expectedId || clientSecret !== expectedSecret) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 31536000, // effectively long-lived - single personal client, no rotation UI
    scope: "seo:read",
  });
}
