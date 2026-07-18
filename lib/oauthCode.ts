import crypto from "crypto";

// Self-contained, signed authorization codes - avoids needing a database or
// shared cache between the /authorize and /token requests (which may hit
// different serverless instances on Vercel). The code IS the state: redirect_uri,
// PKCE challenge and an expiry, HMAC-signed with MCP_CLIENT_SECRET so it can't
// be forged or tampered with, verified again at the token exchange step.

export type AuthCodePayload = {
  redirectUri: string;
  codeChallenge: string;
  resource?: string;
  exp: number; // seconds since epoch
};

function secret(): string {
  const s = process.env.MCP_CLIENT_SECRET;
  if (!s) throw new Error("Missing MCP_CLIENT_SECRET env var");
  return s;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function issueAuthCode(payload: AuthCodePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyAuthCode(code: string): AuthCodePayload | null {
  const [body, signature] = code.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload: AuthCodePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (Date.now() / 1000 > payload.exp) return null;
  return payload;
}

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
