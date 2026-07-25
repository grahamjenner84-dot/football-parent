import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { __setDbForTests, closeDb } from "../../../scripts/seo/database/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, "..", "..", "..", "scripts", "seo", "database", "schema.sql");

// Isolated in-memory database per test, so tests/seo/*.test.ts never touch
// the real seo-data/database/seo.db. Every module under test calls the
// shared getDb() singleton, so this just points that singleton at an
// in-memory instance instead - see __setDbForTests in database/db.ts.
export function useTestDb(): { close: () => void } {
  closeDb();
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
  __setDbForTests(db);
  return {
    close: () => {
      __setDbForTests(null);
      db.close();
    },
  };
}
