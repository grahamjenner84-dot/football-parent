import fs from "node:fs";
import path from "node:path";

// Same manual .env.local loader pattern used by scripts/inspect-page.mjs and
// scripts/lib/load-env.ts elsewhere in this repo - no dotenv dependency.
export function loadEnvLocal(repoRoot) {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const SECRET_KEYS = ["DATAFORSEO_LOGIN", "DATAFORSEO_USERNAME", "DATAFORSEO_PASSWORD"];

// Defence-in-depth so credentials never end up in a raw response file or
// console line even via a leaked error message.
export function redactSecrets(input) {
  let out = input;
  for (const key of SECRET_KEYS) {
    const value = process.env[key];
    if (value && value.length >= 4) out = out.split(value).join(`<redacted:${key}>`);
  }
  return out;
}

export function getDataForSeoCredentials() {
  const username = process.env.DATAFORSEO_USERNAME || process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "Missing DataForSEO credentials: set DATAFORSEO_LOGIN (or DATAFORSEO_USERNAME) and DATAFORSEO_PASSWORD in .env.local"
    );
  }
  return { username, password };
}
