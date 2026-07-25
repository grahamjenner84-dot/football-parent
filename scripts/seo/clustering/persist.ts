import { getDb, nowIso } from "../database/db";
import { keywordIdentity } from "../shared/normalise";
import type { Cluster } from "./intent-cluster";

// Ensures a keywords row exists for a raw keyword string, returning its id.
// Used when persisting discovery/cluster results for keywords that may not
// already be in the tracker.
export function ensureKeyword(raw: string, volume?: number | null): number {
  const db = getDb();
  const identity = keywordIdentity(raw);
  const existing = db
    .prepare(
      "SELECT id, volume FROM keywords WHERE normalised_keyword = ? AND search_engine = ? AND location_code = ? AND language_code = ?"
    )
    .get(identity.normalisedKeyword, identity.searchEngine, identity.locationCode, identity.languageCode) as
    | { id: number; volume: number | null }
    | undefined;

  if (existing) {
    if (volume != null && existing.volume == null) {
      db.prepare("UPDATE keywords SET volume = ?, updated_at = ? WHERE id = ?").run(volume, nowIso(), existing.id);
    }
    return existing.id;
  }

  const result = db
    .prepare(
      `INSERT INTO keywords (keyword, normalised_keyword, search_engine, location_code, language_code, volume, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(raw, identity.normalisedKeyword, identity.searchEngine, identity.locationCode, identity.languageCode, volume ?? null, nowIso(), nowIso());
  return Number(result.lastInsertRowid);
}

export function persistClusters(clusters: Cluster[], pillar?: string, intent?: string): number[] {
  const db = getDb();
  const clusterIds: number[] = [];

  const insertCluster = db.prepare(
    "INSERT INTO content_clusters (name, pillar, intent, created_at) VALUES (?, ?, ?, ?)"
  );
  const linkKeyword = db.prepare(
    "INSERT INTO cluster_keywords (cluster_id, keyword_id) VALUES (?, ?) ON CONFLICT(cluster_id, keyword_id) DO NOTHING"
  );

  for (const cluster of clusters) {
    const result = insertCluster.run(cluster.label, pillar ?? null, intent ?? null, nowIso());
    const clusterId = Number(result.lastInsertRowid);
    clusterIds.push(clusterId);
    for (const kw of cluster.keywords) {
      const keywordId = ensureKeyword(kw.keyword, kw.volume ?? null);
      linkKeyword.run(clusterId, keywordId);
    }
  }

  return clusterIds;
}
