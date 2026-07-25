import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normaliseKeyword,
  keywordIdentity,
  DEFAULT_LOCATION_CODE,
  DEFAULT_LANGUAGE_CODE,
  DEFAULT_SEARCH_ENGINE,
} from "../../scripts/seo/shared/normalise";

test("normaliseKeyword lowercases and collapses whitespace", () => {
  assert.equal(normaliseKeyword("  Football   Academy   Trials  "), "football academy trials");
});

test("normaliseKeyword does not strip meaning-bearing punctuation", () => {
  assert.equal(normaliseKeyword("boys' football"), "boys' football");
  assert.equal(normaliseKeyword("5-a-side"), "5-a-side");
});

test("normaliseKeyword strips surrounding punctuation only", () => {
  assert.equal(normaliseKeyword("'football trials'"), "football trials");
});

test("keywordIdentity defaults to UK location code 2826", () => {
  const identity = keywordIdentity("football academy trials");
  assert.equal(identity.locationCode, DEFAULT_LOCATION_CODE);
  assert.equal(DEFAULT_LOCATION_CODE, 2826);
});

test("keywordIdentity defaults to English language code", () => {
  const identity = keywordIdentity("football academy trials");
  assert.equal(identity.languageCode, DEFAULT_LANGUAGE_CODE);
  assert.equal(DEFAULT_LANGUAGE_CODE, "en");
});

test("keywordIdentity defaults to google search engine", () => {
  const identity = keywordIdentity("football academy trials");
  assert.equal(identity.searchEngine, DEFAULT_SEARCH_ENGINE);
});

test("keywordIdentity allows overriding defaults", () => {
  const identity = keywordIdentity("football", { locationCode: 2840, languageCode: "es", searchEngine: "bing" });
  assert.equal(identity.locationCode, 2840);
  assert.equal(identity.languageCode, "es");
  assert.equal(identity.searchEngine, "bing");
});

test("two differently-worded-but-equivalent keywords normalise to the same identity", () => {
  const a = keywordIdentity("  Football Academy Trials ");
  const b = keywordIdentity("football academy trials");
  assert.equal(a.normalisedKeyword, b.normalisedKeyword);
});
