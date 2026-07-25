import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../shared/env";

// better-sqlite3 requires a native compile on this machine and fails (no
// VC++ Desktop workload installed alongside Visual Studio - confirmed by a
// real `npm install better-sqlite3` attempt, which fell through node-gyp to
// "could not find a version of Visual Studio... missing any VC++ toolset").
// node:sqlite (Node >=22.5, stable enough here on Node 24) ships inside the
// Node binary itself - zero native deps, zero install step - and its
// DatabaseSync API is close enough to better-sqlite3's synchronous style
// that the rest of this codebase reads the same either way.

export const DB_PATH = path.join(REPO_ROOT, "seo-data", "database", "seo.db");

let db: DatabaseSync | null = null;
let testOverride: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (testOverride) return testOverride;
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  return db;
}

// Test-only seam: point every module that calls getDb() at an isolated
// in-memory database instead of the real seo-data/database/seo.db, without
// threading a `db` parameter through every function. See tests/seo/helpers/test-db.ts.
export function __setDbForTests(customDb: DatabaseSync | null): void {
  testOverride = customDb;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function nowIso(): string {
  return new Date().toISOString().replace(/(\.\d{3})\d*Z$/, "$1Z");
}
