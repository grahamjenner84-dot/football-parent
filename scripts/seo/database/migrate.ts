import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, "schema.sql");
const SCHEMA_VERSION = "6";

// v2 added 7 content-status-backlog columns to `pages` (fact_checked_at,
// seo_optimised_at, personal_story_count, expert_quote_count,
// expert_quote_pending, inbound_internal_links, inbound_links_checked_at).
// schema.sql's CREATE TABLE IF NOT EXISTS covers a brand-new DB, but is a
// no-op against an already-existing `pages` table from before v2, so those
// columns are added explicitly below - keyed off actual column presence
// (PRAGMA table_info), not the stored version number, so this stays safe to
// re-run under any prior partial state.
const PAGES_V2_COLUMNS: Array<{ name: string; ddl: string }> = [
  { name: "fact_checked_at", ddl: "TEXT" },
  { name: "seo_optimised_at", ddl: "TEXT" },
  { name: "personal_story_count", ddl: "INTEGER NOT NULL DEFAULT 0" },
  { name: "expert_quote_count", ddl: "INTEGER NOT NULL DEFAULT 0" },
  { name: "expert_quote_pending", ddl: "INTEGER NOT NULL DEFAULT 0" },
  { name: "inbound_internal_links", ddl: "INTEGER" },
  { name: "inbound_links_checked_at", ddl: "TEXT" },
];

// v3 added 4 voice-density columns to `pages` - computed word counts synced
// from internal-link-audit.mjs's link-audit-voice.json, not manually set.
const PAGES_V3_COLUMNS: Array<{ name: string; ddl: string }> = [
  { name: "body_word_count", ddl: "INTEGER" },
  { name: "voice_word_count", ddl: "INTEGER" },
  { name: "voice_pct", ddl: "REAL" },
  { name: "voice_checked_at", ddl: "TEXT" },
];

// v4 added AI-slop-check and last-reviewed tracking to `pages` - see the
// comment on these columns in schema.sql for why they're separate from
// fact_checked_at/updated_at.
const PAGES_V4_COLUMNS: Array<{ name: string; ddl: string }> = [
  { name: "ai_slop_checked_at", ddl: "TEXT" },
  { name: "last_reviewed_at", ddl: "TEXT" },
];

// v5 added unmarked-first-person-voice candidate tracking to `pages` - see
// the comment on these columns in schema.sql for why they're deliberately
// kept separate from voice_pct rather than blended into it.
const PAGES_V5_COLUMNS: Array<{ name: string; ddl: string }> = [
  { name: "unmarked_voice_word_count", ddl: "INTEGER" },
  { name: "unmarked_voice_sentence_count", ddl: "INTEGER" },
  { name: "unmarked_voice_candidates", ddl: "TEXT" },
  { name: "unmarked_voice_synced_at", ddl: "TEXT" },
];

// v6 added confirmed-genuine-voice tracking to `pages` - see the comment on
// these columns in schema.sql for why they're deliberately separate from
// both voice_pct (tag-only) and the raw unmarked_voice_* candidate columns.
const PAGES_V6_COLUMNS: Array<{ name: string; ddl: string }> = [
  { name: "confirmed_voice_word_count", ddl: "INTEGER" },
  { name: "confirmed_voice_sentences", ddl: "TEXT" },
  { name: "confirmed_voice_reviewed_at", ddl: "TEXT" },
];

// schema.sql is otherwise entirely CREATE TABLE/INDEX IF NOT EXISTS, so
// re-running it is always safe. Bumping SCHEMA_VERSION and appending
// guarded ALTER TABLE statements (as above) is the path for future
// non-additive changes.
export function migrate(): { schemaVersion: string; alreadyCurrent: boolean } {
  const db = getDb();
  const sql = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(sql);

  const existingPagesColumns = new Set(
    (db.prepare("PRAGMA table_info(pages)").all() as { name: string }[]).map((c) => c.name)
  );
  for (const { name, ddl } of [
    ...PAGES_V2_COLUMNS,
    ...PAGES_V3_COLUMNS,
    ...PAGES_V4_COLUMNS,
    ...PAGES_V5_COLUMNS,
    ...PAGES_V6_COLUMNS,
  ]) {
    if (!existingPagesColumns.has(name)) {
      db.exec(`ALTER TABLE pages ADD COLUMN ${name} ${ddl}`);
    }
  }

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
