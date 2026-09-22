import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CACHE_DIR = path.join(import.meta.dirname, "..", "cache");

function familyDir(family) {
  const dir = path.join(CACHE_DIR, family);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function cacheKeyFor(family, identity) {
  const hash = crypto.createHash("sha256").update(JSON.stringify(identity)).digest("hex").slice(0, 24);
  return hash;
}

// Cache-first local store, one JSON file per request. Deliberately dumb
// (no SQLite) so this stays a genuinely standalone .mjs tool with zero new
// dependencies - see run.mjs for the resume/progress layer built on top.
export function readCache(family, key, ttlDays) {
  const file = path.join(familyDir(family), `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    const ageMs = Date.now() - new Date(parsed.cachedAt).getTime();
    if (ageMs > ttlDays * 24 * 60 * 60 * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCache(family, key, data) {
  const file = path.join(familyDir(family), `${key}.json`);
  fs.writeFileSync(file, JSON.stringify({ cachedAt: new Date().toISOString(), data }, null, 2));
}

// A small append-only JSON-lines log of every DataForSEO call actually made
// (cache misses only) - cost, endpoint, environment - so a run's real spend
// can be reviewed afterwards without re-parsing every cache file.
const USAGE_LOG = path.join(CACHE_DIR, "api-usage.jsonl");

export function logApiUsage(row) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.appendFileSync(USAGE_LOG, JSON.stringify({ at: new Date().toISOString(), ...row }) + "\n");
}

export function summariseUsage() {
  if (!fs.existsSync(USAGE_LOG)) return { calls: 0, cost: 0 };
  const lines = fs.readFileSync(USAGE_LOG, "utf8").trim().split("\n").filter(Boolean);
  let calls = 0;
  let cost = 0;
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      calls += 1;
      cost += row.cost || 0;
    } catch {
      // ignore malformed line
    }
  }
  return { calls, cost };
}
