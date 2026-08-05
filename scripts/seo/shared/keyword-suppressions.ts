// Exact-match junk-keyword filter for DataForSEO Labs discovery results
// (keyword_ideas/related_keywords/keyword_suggestions). These endpoints
// fall back to broad, off-topic matches when seed keywords have near-zero
// measured volume - see keyword-suppressions.json for how this list was
// seeded. Exact match only: it suppresses previously-seen junk, it does not
// predict junk from new seeds.
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./env";

const LIST_PATH = path.join(REPO_ROOT, "scripts", "seo", "shared", "keyword-suppressions.json");

let cached: Set<string> | null = null;

function loadSuppressions(): Set<string> {
  if (cached) return cached;
  const raw = JSON.parse(fs.readFileSync(LIST_PATH, "utf8")) as { terms: string[] };
  cached = new Set(raw.terms.map((t) => t.toLowerCase().trim()));
  return cached;
}

export function isSuppressedKeyword(keyword: string): boolean {
  return loadSuppressions().has(keyword.toLowerCase().trim());
}

export function filterSuppressed<T extends { keyword: string }>(items: T[]): T[] {
  return items.filter((item) => !isSuppressedKeyword(item.keyword));
}
