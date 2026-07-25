// Shared persistence for parsed DataForSEO results - factored out of
// scripts/seo/cli/live-search-volume.ts so scripts/seo/cli/page-keyword-research.ts
// doesn't duplicate the same upsert logic.
import { getDb, nowIso } from "../database/db";
import { keywordIdentity } from "../shared/normalise";

export type UpsertKeywordParams = {
  keyword: string;
  volume: number | null;
  cpc?: number | null;
  competition?: number | string | null;
  keywordDifficulty?: number | null;
  searchIntent?: string | null;
  source: string;
  targetUrl?: string | null;
  mappedArticle?: string | null;
  isSandbox: boolean;
  rawResponseId: number | null;
};

// Inserts/updates the keywords row (latest-snapshot fields, used by the
// keyword tracker export) and appends a keyword_metrics history row
// (never overwritten, so repeated research on the same keyword builds a
// real trend instead of losing the previous reading).
export function upsertKeywordWithMetrics(p: UpsertKeywordParams): number {
  const db = getDb();
  const identity = keywordIdentity(p.keyword);
  const now = nowIso();

  db.prepare(
    `INSERT INTO keywords (keyword, normalised_keyword, search_engine, location_code, language_code, volume, kd, source, target_url, mapped_article, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(normalised_keyword, search_engine, location_code, language_code) DO UPDATE SET
       volume = excluded.volume,
       kd = COALESCE(excluded.kd, keywords.kd),
       source = excluded.source,
       target_url = COALESCE(excluded.target_url, keywords.target_url),
       mapped_article = COALESCE(excluded.mapped_article, keywords.mapped_article),
       updated_at = excluded.updated_at`
  ).run(
    p.keyword,
    identity.normalisedKeyword,
    identity.searchEngine,
    identity.locationCode,
    identity.languageCode,
    p.volume,
    p.keywordDifficulty ?? null,
    p.source,
    p.targetUrl ?? null,
    p.mappedArticle ?? null,
    now,
    now
  );

  const row = db
    .prepare("SELECT id FROM keywords WHERE normalised_keyword = ? AND search_engine = ? AND location_code = ? AND language_code = ?")
    .get(identity.normalisedKeyword, identity.searchEngine, identity.locationCode, identity.languageCode) as { id: number };

  const competitionValue = typeof p.competition === "number" ? p.competition : null;

  db.prepare(
    `INSERT INTO keyword_metrics (keyword_id, retrieved_at, search_volume, cpc, competition, keyword_difficulty, search_intent, is_sandbox, raw_response_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(row.id, now, p.volume, p.cpc ?? null, competitionValue, p.keywordDifficulty ?? null, p.searchIntent ?? null, p.isSandbox ? 1 : 0, p.rawResponseId);

  return row.id;
}

export function linkPageKeyword(pageUrl: string, keywordId: number, relationship: "primary" | "secondary" | "ranking" | "opportunity"): void {
  const db = getDb();
  const page = db.prepare("SELECT id FROM pages WHERE url = ?").get(pageUrl) as { id: number } | undefined;
  if (!page) return;
  db.prepare(
    "INSERT INTO page_keywords (page_id, keyword_id, relationship, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(page_id, keyword_id, relationship) DO NOTHING"
  ).run(page.id, keywordId, relationship, nowIso());
}
