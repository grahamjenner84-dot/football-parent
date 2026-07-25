import { createHash } from "node:crypto";

// Recursively sort object keys so two logically-identical request parameter
// sets always serialise to the same string regardless of property insertion
// order or array-vs-undefined quirks.
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortValue(v)]));
  }
  return value;
}

// Every material request parameter must be part of the hash so two searches
// never share a cache record when they differ in endpoint, seed terms,
// country, language, filters, limits, date range, search engine, device,
// result type, comparison targets, or environment (sandbox vs live results
// are never comparable, so environment is always part of the identity).
export type HashableRequest = {
  apiFamily: string;
  endpoint: string;
  environment: "sandbox" | "live";
  params: Record<string, unknown>;
};

export function requestHash(req: HashableRequest): string {
  const canonical = stableStringify({
    apiFamily: req.apiFamily,
    endpoint: req.endpoint,
    environment: req.environment,
    params: req.params,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
