import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.join(import.meta.dirname, "..", "output");
const STATE_FILE = path.join(OUTPUT_DIR, "run-state.json");

function ensureDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const EMPTY_STATE = {
  discoveredSites: [], // Stage 1 output
  brokenLinks: [], // Stage 2 output
  brokenResources: [], // Stage 3+4 output, keyed by broken_url
  opportunities: [], // Stage 5-7 output
};

// Whole-run state persisted after every stage so an interrupted run resumes
// from the last completed stage instead of re-paying for earlier stages.
export function loadState() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) return structuredClone(EMPTY_STATE);
  try {
    return { ...structuredClone(EMPTY_STATE), ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
  } catch {
    console.warn(`[progress] ${STATE_FILE} was unreadable, starting fresh`);
    return structuredClone(EMPTY_STATE);
  }
}

export function saveState(state) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
