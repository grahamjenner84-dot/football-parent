import { NextRequest, NextResponse } from "next/server";
import { issueAuthCode } from "@/lib/oauthCode";

// OAuth 2.1 authorization endpoint (authorization_code + PKCE) for the MCP
// connector. claude.ai's connector setup redirects the browser here as its
// "log in and approve" step - conventionally at /authorize when no
// authorization_endpoint is declared yet, which is why this lives at the
// domain root rather than under /api/oauth/. Declared explicitly in
// app/.well-known/oauth-authorization-server now too.
//
// There's exactly one legitimate client (this repo's own MCP connector) and
// no other user accounts, so this auto-approves rather than showing a
// login/consent screen - the real security boundary is the client_secret
// required at the token-exchange step (app/api/oauth/token), which this
// authorization code alone can't get past.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const responseType = params.get("response_type");
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const codeChallenge = params.get("code_challenge");
  const codeChallengeMethod = params.get("code_challenge_method");
  const state = params.get("state");
  const resource = params.get("resource") || undefined;

  // Can't safely redirect an error until we trust client_id and have a
  // plausible redirect_uri - render an inline error instead of bouncing the
  // browser to an unvalidated URL.
  if (!redirectUri || !redirectUri.startsWith("https://")) {
    return NextResponse.json({ error: "invalid_request", error_description: "Missing or invalid redirect_uri" }, { status: 400 });
  }
  if (clientId !== process.env.MCP_CLIENT_ID) {
    return NextResponse.json({ error: "unauthorized_client" }, { status: 400 });
  }

  const redirectWithError = (error: string, description: string) => {
    const dest = new URL(redirectUri);
    dest.searchParams.set("error", error);
    dest.searchParams.set("error_description", description);
    if (state) dest.searchParams.set("state", state);
    return NextResponse.redirect(dest.toString());
  };

  if (responseType !== "code") {
    return redirectWithError("unsupported_response_type", "Only 'code' is supported");
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return redirectWithError("invalid_request", "PKCE with S256 is required");
  }

  const code = issueAuthCode({
    redirectUri,
    codeChallenge,
    resource,
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes to complete the exchange
  });

  const dest = new URL(redirectUri);
  dest.searchParams.set("code", code);
  if (state) dest.searchParams.set("state", state);
  return NextResponse.redirect(dest.toString());
}
