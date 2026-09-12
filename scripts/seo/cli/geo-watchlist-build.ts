// Builds the keyword watchlist for recurring AI Overview / PAA citation
// tracking (see geo-watchlist-check.ts, the paid half of this pair). Free -
// GSC only, no DataForSEO spend.
//
// Two buckets, both worth watching for different reasons:
//   - best_performing: real clicks today, position <=10. If an AI Overview
//     starts appearing on one of these, that's a citation worth defending
//     since it's proven, high-value traffic.
//   - page_2_3: position 11-30 with real impressions. The 12 Sept GEO pass
//     found footballparent.co.uk cited in AI Overviews on some page-2/3
//     queries despite not ranking organically top 10 - citation doesn't
//     strictly require a top-10 ranking, so these are worth checking even
//     though generate-seo-opportunities.mjs's striking-distance analysis
//     already treats them as a ranking-improvement opportunity.
//
// Usage:
//   npx tsx scripts/seo/cli/geo-watchlist-build.ts [--best 25] [--page23 25]
import fs from "node:fs";
import path from "node:path";
import { JWT } from "google-auth-library";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");
const OUT_PATH = path.join(EXPORT_DIR, "geo-watchlist.json");

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

function getClient(): JWT {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  }
  const key = rawKey.replace(/\\n/g, "\n");
  return new JWT({ email, key, scopes: SCOPES });
}

type GscRow = { keys: [string, string]; clicks: number; impressions: number; ctr: number; position: number };

async function fetchRows(client: JWT, startDate: string, endDate: string): Promise<GscRow[]> {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) throw new Error("Missing GSC_SITE_URL");
  const rows: GscRow[] = [];
  let startRow = 0;
  const rowLimit = 25000;
  while (true) {
    const res = await client.request<{ rows?: GscRow[] }>({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      method: "POST",
      data: { startDate, endDate, dimensions: ["query", "page"], rowLimit, startRow },
    });
    const batch = res.data.rows ?? [];
    rows.push(...batch);
    if (batch.length < rowLimit) break;
    startRow += rowLimit;
  }
  return rows;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseArgs(argv: string[]) {
  const get = (flag: string, fallback: number) => {
    const idx = argv.indexOf(flag);
    if (idx === -1 || !argv[idx + 1]) return fallback;
    const n = Number(argv[idx + 1]);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return { best: get("--best", 25), page23: get("--page23", 25) };
}

type WatchlistEntry = {
  keyword: string;
  page: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  bucket: "best_performing" | "page_2_3";
};

async function main() {
  const { best, page23 } = parseArgs(process.argv.slice(2));
  const client = getClient();

  const end = new Date();
  end.setDate(end.getDate() - 3);
  const start = new Date(end);
  start.setDate(start.getDate() - 89);

  const rows = await fetchRows(client, isoDate(start), isoDate(end));

  // A query commonly ranks on more than one page/anchor-fragment - dedupe
  // to one row per keyword per bucket (keeping its best-impression page)
  // before ranking, so the watchlist checks each real query once rather
  // than paying for the same AI Overview call multiple times.
  const bestByKeyword = new Map<string, WatchlistEntry>();
  const page23ByKeyword = new Map<string, WatchlistEntry>();

  for (const r of rows) {
    const [keyword, page] = r.keys;
    const entry: WatchlistEntry = {
      keyword,
      page,
      position: Math.round(r.position * 10) / 10,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: Math.round(r.ctr * 1000) / 10,
      bucket: "best_performing",
    };

    if (r.position <= 10 && r.impressions >= 20 && r.clicks > 0) {
      const existing = bestByKeyword.get(keyword);
      if (!existing || entry.impressions > existing.impressions) bestByKeyword.set(keyword, entry);
    } else if (r.position >= 11 && r.position <= 30 && r.impressions >= 15) {
      const existing = page23ByKeyword.get(keyword);
      if (!existing || entry.impressions > existing.impressions) page23ByKeyword.set(keyword, { ...entry, bucket: "page_2_3" });
    }
  }

  // A keyword qualifying for both buckets (ranks top-10 on one page, page
  // 2/3 on another) counts once, as best_performing - that's the more
  // load-bearing classification for a watchlist.
  for (const keyword of bestByKeyword.keys()) page23ByKeyword.delete(keyword);

  const bestPerforming = [...bestByKeyword.values()].sort((a, b) => b.clicks - a.clicks);
  const page2to3 = [...page23ByKeyword.values()].sort((a, b) => b.impressions - a.impressions);

  const entries = [...bestPerforming.slice(0, best), ...page2to3.slice(0, page23)];

  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const out = {
    generatedAt: new Date().toISOString(),
    windowStart: isoDate(start),
    windowEnd: isoDate(end),
    counts: { bestPerforming: Math.min(best, bestPerforming.length), page2to3: Math.min(page23, page2to3.length) },
    entries,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

  console.log(`Watchlist built: ${entries.length} keywords (${out.counts.bestPerforming} best-performing, ${out.counts.page2to3} page 2/3)`);
  console.log(`Written to ${OUT_PATH}`);
  console.log(`\nNext: LIVE_CONFIRM=yes npx tsx scripts/seo/cli/geo-watchlist-check.ts`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
