// Imported first (side-effect only) in test files that exercise
// lib/instagram/publish-flow.ts, before that module is imported - its
// POLL_INTERVAL_MS/POLL_BUDGET_MS/retry-delay constants are read from these
// env vars once at module-evaluation time, so they must already be set
// before the first `import ... from "../lib/instagram/publish-flow"` runs.
// Production defaults (10s/45s/2s) are unaffected - this only ever changes
// behaviour under the test runner.
process.env.PUBLISH_POLL_INTERVAL_MS ??= "5";
process.env.PUBLISH_POLL_BUDGET_MS ??= "40";
process.env.PUBLISH_RETRY_BASE_DELAY_MS ??= "1";

export {};
