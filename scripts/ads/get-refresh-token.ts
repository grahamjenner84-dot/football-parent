/**
 * One-time OAuth flow to mint a Google Ads API refresh token.
 *
 * Google Ads only supports service accounts via Workspace domain-wide
 * delegation, which this (googlemail.com) account cannot do, so unlike the
 * GSC setup in lib/gsc.ts this has to be a user OAuth refresh token.
 *
 * Prereq: GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET in .env.local,
 * from a Google Cloud OAuth client of type "Desktop app".
 *
 * Run:  npx tsx scripts/ads/get-refresh-token.ts
 * Then paste the printed token into GOOGLE_ADS_REFRESH_TOKEN in .env.local.
 */
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { OAuth2Client } from "google-auth-library";
import { loadEnvLocal } from "../lib/load-env";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvLocal(REPO_ROOT);

const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "Missing GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET in .env.local.\n" +
      "Create an OAuth client (type: Desktop app) in the Google Cloud project\n" +
      "that has the Google Ads API enabled, then add both values."
  );
  process.exit(1);
}

// The out-of-band redirect Google still allows for Desktop-app clients: the
// consent screen shows the code on screen rather than calling back to a server.
const REDIRECT_URI = "http://localhost";
const SCOPE = "https://www.googleapis.com/auth/adwords";

async function main(): Promise<void> {
  const client = new OAuth2Client({ clientId, clientSecret, redirectUri: REDIRECT_URI });

  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh token even on re-runs
    scope: [SCOPE],
  });

  console.log("\n1. Open this URL and approve access:\n");
  console.log(url);
  console.log(
    "\n2. The browser will land on a localhost page that fails to load. That is expected.\n" +
      "   Copy the `code` parameter out of the address bar.\n"
  );

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = (await rl.question("3. Paste the code here: ")).trim();
  rl.close();

  if (!code) {
    console.error("No code given, aborting.");
    process.exit(1);
  }

  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    console.error(
      "No refresh token returned. This usually means the account has already\n" +
        "granted consent. Revoke access at https://myaccount.google.com/permissions\n" +
        "and run this again."
    );
    process.exit(1);
  }

  console.log("\nAdd this to .env.local:\n");
  console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}\n`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
