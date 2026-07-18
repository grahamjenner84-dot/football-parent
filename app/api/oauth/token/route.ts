import { NextRequest, NextResponse } from "next/server";
import { verifyAuthCode, verifyPkce } from "@/lib/oauthCode";

// OAuth 2.0 token endpoint for the MCP connector - supports both grants:
// - authorization_code (+ PKCE): what claude.ai's connector actually uses,
//   completing the browser redirect from app/authorize/route.ts.
// - client_credentials: kept as a fallback for any client that skips the
//   browser step and authenticates directly with the client secret.
// Either way, a successful exchange hands back the same MCP_ACCESS_TOKEN
// that app/api/[transport]/route.ts already validates on every MCP request -
// this endpoint only decides whether a client is allowed to *obtain* that
// token, not what it's allowed to do with it.

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

function tokenResponse() {
  return NextResponse.json({
    access_token: process.env.MCP_ACCESS_TOKEN,
    token_type: "Bearer",
    expires_in: 31536000, // effectively long-lived - single personal client, no rotation UI
    scope: "seo:read",
  });
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
  const accessToken = process.env.MCP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "server_error", error_description: "MCP_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  if (grantType === "authorization_code") {
    const code = body.get("code");
    const redirectUri = body.get("redirect_uri");
    const codeVerifier = body.get("code_verifier");
    const { clientId, clientSecret } = extractClientCredentials(req, body);

    if (clientId !== process.env.MCP_CLIENT_ID || clientSecret !== process.env.MCP_CLIENT_SECRET) {
      return NextResponse.json({ error: "invalid_client" }, { status: 401 });
    }
    if (!code || !redirectUri || !codeVerifier) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const payload = verifyAuthCode(code);
    if (!payload) {
      return NextResponse.json({ error: "invalid_grant", error_description: "Code is invalid or expired" }, { status: 400 });
    }
    if (payload.redirectUri !== redirectUri) {
      return NextResponse.json({ error: "invalid_grant", error_description: "redirect_uri mismatch" }, { status: 400 });
    }
    if (!verifyPkce(codeVerifier, payload.codeChallenge)) {
      return NextResponse.json({ error: "invalid_grant", error_description: "PKCE verification failed" }, { status: 400 });
    }

    return tokenResponse();
  }

  if (grantType === "client_credentials") {
    const { clientId, clientSecret } = extractClientCredentials(req, body);
    if (clientId !== process.env.MCP_CLIENT_ID || clientSecret !== process.env.MCP_CLIENT_SECRET) {
      return NextResponse.json({ error: "invalid_client" }, { status: 401 });
    }
    return tokenResponse();
  }

  return NextResponse.json(
    { error: "unsupported_grant_type", error_description: "Use authorization_code or client_credentials" },
    { status: 400 }
  );
}
