/**
 * One-off: mint a Google Ads API refresh token with the OAuth desktop
 * (loopback) flow. Sign in as footballparentuk@gmail.com.
 *
 * Google Ads only supports service accounts via Workspace domain-wide
 * delegation, which a googlemail.com account cannot do, so unlike the GSC
 * setup in lib/gsc.ts this has to be a user OAuth refresh token.
 *
 * Run with the Desktop client's downloaded JSON:
 *   node scripts/get-google-ads-refresh-token.mjs "C:\Users\...\Downloads\client_secret_....json"
 * or with GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET in .env.local:
 *   node scripts/get-google-ads-refresh-token.mjs
 *
 * It listens on 127.0.0.1 for the redirect and prints the refresh token.
 * Add --save to write it (and the client id/secret, when read from the JSON)
 * into .env.local instead of printing it. Never commit the client secret JSON
 * or the token.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCOPE = "https://www.googleapis.com/auth/adwords";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    if (!(key in process.env)) process.env[key] = value;
  }
}

const SAVE = process.argv.includes("--save");
const ARGS = process.argv.slice(2).filter((a) => a !== "--save");

// Sets or replaces KEY=value lines in .env.local (gitignored via .env*).
function saveToEnvLocal(values) {
  const envPath = path.join(REPO_ROOT, ".env.local");
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    text = re.test(text) ? text.replace(re, () => line) : `${text.replace(/\n?$/, "\n")}${line}\n`;
  }
  fs.writeFileSync(envPath, text);
}

function readClient() {
  const file = ARGS[0];
  if (file) {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    const c = json.installed ?? json.web;
    if (!c?.client_id || !c?.client_secret) throw new Error(`No client_id/client_secret in ${file}`);
    return { clientId: c.client_id, clientSecret: c.client_secret };
  }
  loadEnvLocal();
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Pass the Desktop client's client_secret_*.json path, or set GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET in .env.local."
    );
  }
  return { clientId, clientSecret };
}

const base64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function main() {
  const { clientId, clientSecret } = readClient();
  const state = base64url(crypto.randomBytes(16));
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());

  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const redirectUri = `http://127.0.0.1:${server.address().port}`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // force a refresh token even on re-runs
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  console.log("\nOpen this URL, sign in as footballparentuk@gmail.com and approve:\n");
  console.log(authUrl.toString());
  console.log("\nWaiting for the redirect...");

  const code = await new Promise((resolve, reject) => {
    server.on("request", (req, res) => {
      const params = new URL(req.url, redirectUri).searchParams;
      if (!params.has("code") && !params.has("error")) {
        res.writeHead(404).end();
        return;
      }
      const ok = params.get("state") === state && params.has("code");
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(ok ? "Done. You can close this tab." : `Sign-in failed: ${params.get("error") ?? "state mismatch"}`);
      server.close();
      ok ? resolve(params.get("code")) : reject(new Error(params.get("error") ?? "OAuth state mismatch"));
    });
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  const tokens = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(tokens)}`);
  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh token returned. Revoke the app at https://myaccount.google.com/permissions and run this again."
    );
  }

  if (SAVE) {
    saveToEnvLocal({
      ...(ARGS[0] ? { GOOGLE_ADS_CLIENT_ID: clientId, GOOGLE_ADS_CLIENT_SECRET: clientSecret } : {}),
      GOOGLE_ADS_REFRESH_TOKEN: tokens.refresh_token,
    });
    console.log("\nSaved GOOGLE_ADS_REFRESH_TOKEN to .env.local.");
    return;
  }
  console.log("\nAdd this to .env.local (and Vercel), never to a committed file:\n");
  console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}\n`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
