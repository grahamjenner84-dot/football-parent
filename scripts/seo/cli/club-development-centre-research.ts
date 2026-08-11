// One-off research run: which Premier League / Championship clubs (beyond
// the ones we already cover - Arsenal, Chelsea, Crystal Palace, Fulham,
// Tottenham, West Ham) are worth a dedicated "<Club> Development Centre"
// guide next, based on real UK Google Ads search volume.
//
// Batches 4 phrasings x 37 candidate clubs (148 keywords) into a single
// Google Ads search_volume request - flat-fee per request ($0.09 for
// 1-1000 keywords, see live-search-volume.ts), not per-keyword, so one
// request covers every club/phrasing combo cheaply.
//
// SAFETY: same three-factor live gate as live-search-volume.ts - requires
// DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true (both already set in
// .env.local for this project) and LIVE_CONFIRM=yes passed inline for this
// invocation, on top of confirmLive:true in code, set here only because the
// user explicitly approved this specific request in-session.
// Run:
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/club-development-centre-research.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { keywordIdentity } from "../shared/normalise";
import { ensureEnvLoaded } from "../shared/env";

// 2026-27 season clubs (confirmed via Wikipedia, checked 2026-08-11) minus
// the six we already have dedicated guides for.
const PREMIER_LEAGUE_CANDIDATES = [
  "Aston Villa",
  "Bournemouth",
  "Brentford",
  "Brighton",
  "Coventry City",
  "Everton",
  "Hull City",
  "Ipswich Town",
  "Leeds United",
  "Liverpool",
  "Manchester City",
  "Manchester United",
  "Newcastle United",
  "Nottingham Forest",
  "Sunderland",
];

const CHAMPIONSHIP_CANDIDATES = [
  "Birmingham City",
  "Blackburn Rovers",
  "Bolton Wanderers",
  "Bristol City",
  "Burnley",
  "Cardiff City",
  "Charlton Athletic",
  "Derby County",
  "Lincoln City",
  "Middlesbrough",
  "Millwall",
  "Norwich City",
  "Portsmouth",
  "Preston North End",
  "Queens Park Rangers",
  "Sheffield United",
  "Sheffield Wednesday",
  "Southampton",
  "Stoke City",
  "Swansea City",
  "Watford",
  "West Bromwich Albion",
  "Wolverhampton Wanderers",
  "Wrexham",
];

const PHRASINGS = ["development centre", "academy trials", "youth academy", "pre academy"];

type Candidate = { club: string; league: "Premier League" | "Championship"; keyword: string };

function buildCandidates(): Candidate[] {
  const out: Candidate[] = [];
  for (const club of PREMIER_LEAGUE_CANDIDATES) {
    for (const phrase of PHRASINGS) out.push({ club, league: "Premier League", keyword: `${club} ${phrase}` });
  }
  for (const club of CHAMPIONSHIP_CANDIDATES) {
    for (const phrase of PHRASINGS) out.push({ club, league: "Championship", keyword: `${club} ${phrase}` });
  }
  return out;
}

type SearchVolumeResultItem = {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: string | null;
  competition_index: number | null;
  monthly_searches?: { year: number; month: number; search_volume: number }[];
};

function normaliseForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function main() {
  ensureEnvLoaded(); // loads DATAFORSEO_ENV/DATAFORSEO_ALLOW_LIVE from .env.local before the gate check below
  migrate();
  const db = getDb();

  const candidates = buildCandidates();
  console.log(`Candidate clubs: ${PREMIER_LEAGUE_CANDIDATES.length} Premier League + ${CHAMPIONSHIP_CANDIDATES.length} Championship`);
  console.log(`Requesting Google Ads search volume for ${candidates.length} keywords (UK/English, one batched request).`);

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("\nNot sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const keywords = candidates.map((c) => c.keyword);
  const result = await googleAdsSearchVolume(keywords, {
    workflow: "club-development-centre-research",
    environment: "live",
    confirmLive: true,
  });
  console.log(`\nCall: cacheStatus=${result.cacheStatus} cost=${result.cost} resultCount=${result.resultCount} error=${result.error ?? "none"}`);

  if (result.error || !result.data) {
    console.error("Request failed, nothing persisted:", result.error);
    process.exitCode = 1;
    return;
  }

  const rawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(result.requestHash) as { id: number } | undefined;
  const items = (result.data.tasks?.[0]?.result ?? []) as SearchVolumeResultItem[];

  const byNormalisedKeyword = new Map(candidates.map((c) => [normaliseForMatch(c.keyword), c]));

  const upsertKeyword = db.prepare(
    `INSERT INTO keywords (keyword, normalised_keyword, search_engine, location_code, language_code, volume, source, cluster, keyword_type, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(normalised_keyword, search_engine, location_code, language_code) DO UPDATE SET
       volume = excluded.volume, source = excluded.source, cluster = excluded.cluster, keyword_type = excluded.keyword_type, notes = excluded.notes, updated_at = excluded.updated_at`
  );
  const getKeywordId = db.prepare(
    "SELECT id FROM keywords WHERE normalised_keyword = ? AND search_engine = ? AND location_code = ? AND language_code = ?"
  );
  const insertMetric = db.prepare(
    `INSERT INTO keyword_metrics (keyword_id, retrieved_at, search_volume, cpc, competition, is_sandbox, raw_response_id)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  );

  let matched = 0;
  const results: Array<{ club: string; league: string; keyword: string; volume: number | null; cpc: number | null }> = [];

  for (const item of items) {
    if (!item.keyword) continue;
    const candidate = byNormalisedKeyword.get(normaliseForMatch(item.keyword));
    const identity = keywordIdentity(item.keyword);
    const now = nowIso();

    upsertKeyword.run(
      item.keyword,
      identity.normalisedKeyword,
      identity.searchEngine,
      identity.locationCode,
      identity.languageCode,
      item.search_volume ?? null,
      "dataforseo_live",
      candidate ? `${candidate.club} Development Centre Research` : null,
      "club_dev_centre_candidate",
      candidate ? `Next-club opportunity scan, ${candidate.league}` : null,
      now,
      now
    );
    const keywordId = (
      getKeywordId.get(identity.normalisedKeyword, identity.searchEngine, identity.locationCode, identity.languageCode) as { id: number }
    ).id;

    insertMetric.run(keywordId, now, item.search_volume ?? null, item.cpc ?? null, item.competition ?? null, rawRow?.id ?? null);

    if (candidate) {
      matched++;
      results.push({ club: candidate.club, league: candidate.league, keyword: item.keyword, volume: item.search_volume, cpc: item.cpc });
    }
  }

  console.log(`\nPersisted ${items.length} keyword rows (${matched} matched back to a candidate club/phrasing).`);
  console.log(`Actual API-reported cost: $${result.cost}. Raw response saved at: ${result.rawResponsePath}`);

  // Aggregate combined volume per club (sum of the 4 phrasings) for a quick
  // ranked readout, in addition to what's persisted in the DB.
  const byClub = new Map<string, { league: string; total: number; rows: typeof results }>();
  for (const r of results) {
    const entry = byClub.get(r.club) ?? { league: r.league, total: 0, rows: [] };
    entry.total += r.volume ?? 0;
    entry.rows.push(r);
    byClub.set(r.club, entry);
  }
  const ranked = [...byClub.entries()].sort((a, b) => b[1].total - a[1].total);

  console.log("\n--- Ranked by combined monthly search volume (UK) ---");
  for (const [club, data] of ranked) {
    console.log(`${club} (${data.league}): total ${data.total}/mo`);
    for (const r of data.rows.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))) {
      console.log(`    ${r.keyword}: ${r.volume ?? 0}/mo (cpc: ${r.cpc ?? "n/a"})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
