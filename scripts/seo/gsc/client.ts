// Self-contained GSC fetch client for the SEO research scripts. Deliberately
// duplicates lib/gsc.ts's JWT-client + fetchRows pattern rather than
// importing/modifying lib/gsc.ts, matching this repo's own existing
// precedent (scripts/inspect-page.mjs already duplicates the same pattern
// rather than sharing it with lib/gsc.ts) and keeping the main Next.js app
// untouched. Same credentials, same read-only scope, same service account -
// this is not a new connection, just the same one called from a second
// script.
import { JWT } from "google-auth-library";
import { ensureEnvLoaded } from "../shared/env";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

let cachedClient: JWT | null = null;

function getClient(): JWT {
  ensureEnvLoaded();
  if (cachedClient) return cachedClient;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY env vars");
  }
  const key = rawKey.replace(/\\n/g, "\n");
  cachedClient = new JWT({ email, key, scopes: SCOPES });
  return cachedClient;
}

export type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscFilter = { dimension: string; operator: string; expression: string };

export async function fetchGscRows(
  startDate: string,
  endDate: string,
  dimensions: string[],
  filters: GscFilter[] | null = null
): Promise<GscRow[]> {
  ensureEnvLoaded();
  const client = getClient();
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) throw new Error("Missing GSC_SITE_URL env var");

  const rows: GscRow[] = [];
  let startRow = 0;
  const rowLimit = 25000;
  const body: Record<string, unknown> = { startDate, endDate, dimensions, rowLimit, startRow };
  if (filters) body.dimensionFilterGroups = [{ filters }];

  while (true) {
    body.startRow = startRow;
    const res = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      method: "POST",
      data: body,
    });
    const data = res.data as { rows?: GscRow[] };
    const batch = data.rows || [];
    rows.push(...batch);
    if (batch.length < rowLimit) break;
    startRow += rowLimit;
  }

  return rows;
}

export function gscSiteOrigin(): string {
  ensureEnvLoaded();
  const siteUrl = process.env.GSC_SITE_URL || "";
  const domain = siteUrl.startsWith("sc-domain:") ? siteUrl.replace("sc-domain:", "") : new URL(siteUrl).hostname;
  return `https://www.${domain}`;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
