// One-off term research for the planned equal playing time calculator page
// (game-time-calculator-plan.md, 2026-10-04). The cached database already
// has the head terms ("playing time calculator" 260, "equal playing time
// calculator" 210, both UK, 6 Sept). This checks the phrasings that were
// never looked up - the "fair game time" wording, substitution/rotation tool
// phrasings, the "how many minutes" long tail and app phrasings - so the
// page's title, H2s and FAQs follow real volume rather than guesswork.
//
// One batched Google Ads search_volume request: flat fee per request
// ($0.09 for 1-1000 keywords), not per keyword, so a generous list costs the
// same as a short one. Results are persisted to keywords/keyword_metrics the
// same way club-development-centre-research.ts does, so the volumes show up
// in later cached lookups.
//
// SAFETY: same three-factor live gate as the other research scripts -
// DATAFORSEO_ENV=live and DATAFORSEO_ALLOW_LIVE=true in .env.local, plus
// LIVE_CONFIRM=yes passed inline for this invocation, on top of
// confirmLive:true in code, set here only because Graham approved this
// specific request in-session on 2026-10-04.
// Run:
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/game-time-calculator-term-research.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { keywordIdentity } from "../shared/normalise";
import { ensureEnvLoaded } from "../shared/env";

const WORKFLOW = "game-time-calculator-term-research";

const CANDIDATES = [
  // Controls, already in the database from 6 Sept: a fresh reading checks
  // the batch is consistent with the cached figures.
  "playing time calculator",
  "equal playing time calculator",

  // Calculator phrasings not yet checked
  "equal game time calculator",
  "fair game time calculator",
  "fair playing time calculator",
  "fair play time calculator",
  "equal playing time calculator football",
  "equal game time calculator football",
  "playing time calculator football",
  "football playing time calculator",
  "game time calculator football",
  "football game time calculator",
  "youth football playing time calculator",
  "grassroots football playing time calculator",
  "soccer playing time calculator",
  "equal minutes calculator",

  // The "fair" wording on its own (Graham's question: is "fair game time"
  // the better term?)
  "fair game time",
  "fair game time football",
  "fair playing time",
  "fair game time grassroots football",
  "equal game time",
  "equal playing time",

  // Substitution / rotation tool phrasings
  "football substitution calculator",
  "substitution calculator football",
  "football substitution rotation calculator",
  "football sub rotation calculator",
  "sub rotation generator",
  "substitution rotation generator",
  "football substitution planner",
  "football substitution schedule generator",
  "football rotation planner",
  "youth football substitution chart",
  "football substitution chart",
  "football sub rotation chart",
  "7 a side substitution rotation",
  "7v7 substitution rotation",
  "9v9 substitution rotation",

  // "How many minutes" long tail, for the tables section
  "how many minutes should each player play",
  "how many minutes each player 7 a side",
  "how to work out equal playing time",
  "how to calculate playing time football",
  "how to calculate equal game time",
  "equal game time formula",
  "playing time formula football",

  // App phrasings
  "equal playing time app",
  "playing time tracker app",
  "football playing time tracker",
  "game time tracker football",
  "playing time tracker",
  "football minutes tracker",
];

type MonthlySearch = { year: number; month: number; search_volume: number | null };

type SearchVolumeResultItem = {
  keyword?: string;
  search_volume?: number | null;
  cpc?: number | null;
  competition?: string | null;
  competition_index?: number | null;
  monthly_searches?: MonthlySearch[];
};

function seasonality(months: MonthlySearch[] | undefined): string {
  if (!months?.length) return "";
  const recent = [...months].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)).slice(-12);
  const peak = recent.reduce((best, m) => ((m.search_volume ?? 0) > (best.search_volume ?? 0) ? m : best), recent[0]);
  const low = recent.reduce((worst, m) => ((m.search_volume ?? 0) < (worst.search_volume ?? 0) ? m : worst), recent[0]);
  return `peak ${peak.year}-${String(peak.month).padStart(2, "0")}=${peak.search_volume ?? 0}, low ${low.year}-${String(low.month).padStart(2, "0")}=${low.search_volume ?? 0}`;
}

async function main() {
  ensureEnvLoaded(); // loads DATAFORSEO_ENV/DATAFORSEO_ALLOW_LIVE from .env.local before the gate check below
  migrate();
  const db = getDb();

  console.log(`Requesting Google Ads search volume for ${CANDIDATES.length} keywords (UK/English, one batched request).`);

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("\nNot sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const result = await googleAdsSearchVolume(CANDIDATES, {
    workflow: WORKFLOW,
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

  const now = nowIso();
  for (const item of items) {
    if (!item.keyword) continue;
    const identity = keywordIdentity(item.keyword);
    upsertKeyword.run(
      item.keyword,
      identity.normalisedKeyword,
      identity.searchEngine,
      identity.locationCode,
      identity.languageCode,
      item.search_volume ?? null,
      "dataforseo_live",
      "Game time calculator",
      "calculator_term_candidate",
      "Term research for /coaching/equal-playing-time-calculator, 2026-10-04",
      now,
      now
    );
    const keywordId = (
      getKeywordId.get(identity.normalisedKeyword, identity.searchEngine, identity.locationCode, identity.languageCode) as { id: number }
    ).id;
    insertMetric.run(keywordId, now, item.search_volume ?? null, item.cpc ?? null, item.competition ?? null, rawRow?.id ?? null);
  }

  const sorted = [...items].sort((a, b) => (b.search_volume ?? -1) - (a.search_volume ?? -1));
  console.log(`\n=== Google Ads volume (UK), ${items.length} results ===`);
  console.log(`${"vol".padStart(6)}  ${"cpc".padStart(5)}  ${"comp".padEnd(6)}  keyword`);
  for (const it of sorted) {
    const vol = it.search_volume === null || it.search_volume === undefined ? "null" : String(it.search_volume);
    const cpc = it.cpc === null || it.cpc === undefined ? "-" : it.cpc.toFixed(2);
    const comp = it.competition ?? "-";
    const season = (it.search_volume ?? 0) >= 50 ? `   (${seasonality(it.monthly_searches)})` : "";
    console.log(`${vol.padStart(6)}  ${cpc.padStart(5)}  ${comp.padEnd(6)}  ${it.keyword}${season}`);
  }

  const missing = CANDIDATES.filter((c) => !items.some((it) => it.keyword?.toLowerCase() === c.toLowerCase()));
  if (missing.length) console.log(`\nNo result row returned for: ${missing.join("; ")}`);

  console.log(`\nTotal spend: $${(result.cost ?? 0).toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
