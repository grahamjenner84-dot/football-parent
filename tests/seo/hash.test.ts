import { test } from "node:test";
import assert from "node:assert/strict";
import { requestHash, stableStringify } from "../../scripts/seo/shared/hash";

const base = {
  apiFamily: "dataforseo_labs",
  endpoint: "dataforseo_labs/google/keyword_ideas/live",
  environment: "sandbox" as const,
  params: { keywords: ["football academy trials"], location_code: 2826, language_code: "en", limit: 100 },
};

test("stableStringify is insensitive to key order", () => {
  const a = stableStringify({ b: 1, a: 2 });
  const b = stableStringify({ a: 2, b: 1 });
  assert.equal(a, b);
});

test("requestHash is deterministic for identical input", () => {
  assert.equal(requestHash(base), requestHash(structuredClone(base)));
});

test("requestHash changes when endpoint differs", () => {
  const other = { ...base, endpoint: "dataforseo_labs/google/related_keywords/live" };
  assert.notEqual(requestHash(base), requestHash(other));
});

test("requestHash changes when seed terms differ", () => {
  const other = { ...base, params: { ...base.params, keywords: ["grassroots football"] } };
  assert.notEqual(requestHash(base), requestHash(other));
});

test("requestHash changes when location/language differ", () => {
  const otherLocation = { ...base, params: { ...base.params, location_code: 2840 } };
  const otherLanguage = { ...base, params: { ...base.params, language_code: "fr" } };
  assert.notEqual(requestHash(base), requestHash(otherLocation));
  assert.notEqual(requestHash(base), requestHash(otherLanguage));
});

test("requestHash changes when limit differs", () => {
  const other = { ...base, params: { ...base.params, limit: 10 } };
  assert.notEqual(requestHash(base), requestHash(other));
});

test("requestHash never shares an identity between sandbox and live environments", () => {
  const live = { ...base, environment: "live" as const };
  assert.notEqual(requestHash(base), requestHash(live));
});

test("requestHash is insensitive to param key ordering", () => {
  const reordered = {
    ...base,
    params: { limit: 100, language_code: "en", location_code: 2826, keywords: ["football academy trials"] },
  };
  assert.equal(requestHash(base), requestHash(reordered));
});
