import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "../../lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

let loaded = false;
export function ensureEnvLoaded(): void {
  if (loaded) return;
  loadEnvLocal(REPO_ROOT);
  loaded = true;
}

export type DataForSeoEnvironment = "sandbox" | "live";

export const DATAFORSEO_BASE_URLS: Record<DataForSeoEnvironment, string> = {
  sandbox: "https://sandbox.dataforseo.com/v3",
  live: "https://api.dataforseo.com/v3",
};

export type DataForSeoCredentials = { username: string; password: string };

// The task brief names DATAFORSEO_USERNAME; this repo's .env.local actually
// has DATAFORSEO_LOGIN. Support both, preferring the documented name so a
// future rename to DATAFORSEO_USERNAME needs no code change.
export function getDataForSeoCredentials(): DataForSeoCredentials {
  ensureEnvLoaded();
  const username = process.env.DATAFORSEO_USERNAME || process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "Missing DataForSEO credentials: set DATAFORSEO_USERNAME (or DATAFORSEO_LOGIN) and DATAFORSEO_PASSWORD in .env.local"
    );
  }
  return { username, password };
}

// Default to sandbox when DATAFORSEO_ENV is absent or invalid - never
// silently default to live.
export function getDataForSeoEnvironment(): DataForSeoEnvironment {
  ensureEnvLoaded();
  const raw = (process.env.DATAFORSEO_ENV || "").trim().toLowerCase();
  return raw === "live" ? "live" : "sandbox";
}

// The env-level half of the live-call gate. The other half is the explicit,
// in-code `confirmLive: true` that only the caller can set after the user
// has approved a specific request in the current session - see
// scripts/seo/dataforseo/client.ts for the full three-factor check. This
// function alone must never be treated as sufficient authorisation.
export function isLiveAllowedByEnv(): boolean {
  ensureEnvLoaded();
  return getDataForSeoEnvironment() === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true";
}

export function dataForSeoBaseUrl(env: DataForSeoEnvironment): string {
  return DATAFORSEO_BASE_URLS[env];
}

const KNOWN_SECRET_ENV_KEYS = [
  "DATAFORSEO_USERNAME",
  "DATAFORSEO_LOGIN",
  "DATAFORSEO_PASSWORD",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "MCP_ACCESS_TOKEN",
  "MCP_CLIENT_SECRET",
  "IG_ACCESS_TOKEN",
  "ANTHROPIC_API_KEY",
];

// Defence-in-depth for anything that ends up in a log line or report: strip
// any known secret value out of a string before it's printed or written to
// disk. Credentials must never appear in logs, reports, or raw response
// files even indirectly (e.g. via an error message that echoed a header).
export function redactSecrets(input: string): string {
  ensureEnvLoaded();
  let out = input;
  for (const key of KNOWN_SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.length >= 4) {
      out = out.split(value).join(`<redacted:${key}>`);
    }
  }
  return out;
}
