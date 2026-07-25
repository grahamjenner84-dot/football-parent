import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, "schema.sql");
const SCHEMA_VERSION = "1";

// schema.sql is entirely CREATE TABLE/INDEX IF NOT EXISTS, so re-running it
// is always safe - this is the one and only migration step for now. Bumping
// SCHEMA_VERSION and appending ALTER TABLE statements here (guarded by a
// version check) is the path for future non-additive changes.
export function migrate(): { schemaVersion: string; alreadyCurrent: boolean } {
  const db = getDb();
  const sql = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(sql);

  const row = db.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get() as
    | { value: string }
    | undefined;
  const alreadyCurrent = row?.value === SCHEMA_VERSION;

  db.prepare(
    "INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(SCHEMA_VERSION);

  return { schemaVersion: SCHEMA_VERSION, alreadyCurrent };
}

export function tableCounts(): Record<string, number> {
  const db = getDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[];
  const counts: Record<string, number> = {};
  for (const { name } of tables) {
    const row = db.prepare(`SELECT COUNT(*) as c FROM "${name}"`).get() as { c: number };
    counts[name] = row.c;
  }
  return counts;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const result = migrate();
  console.log(`Schema migrated. Version: ${result.schemaVersion} (already current: ${result.alreadyCurrent})`);
  console.log(tableCounts());
}
