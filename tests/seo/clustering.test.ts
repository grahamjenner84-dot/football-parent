import { test } from "node:test";
import assert from "node:assert/strict";
import { clusterKeywords, dedupeKeywords, tokenize } from "../../scripts/seo/clustering/intent-cluster";

test("tokenize strips stopwords and singularises", () => {
  assert.deepEqual(tokenize("What are the best football academies near me"), ["football", "academy"]);
});

test("obvious wording variants of the same intent are merged into one cluster", () => {
  const clusters = clusterKeywords([
    { keyword: "football academy trials", volume: 1000 },
    { keyword: "trials for football academies", volume: 300 },
    { keyword: "football academy trial process", volume: 50 },
  ]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].keywords.length, 3);
  assert.equal(clusters[0].combinedVolume, 1350);
});

test("unrelated topics are kept in separate clusters", () => {
  const clusters = clusterKeywords([
    { keyword: "football academy trials", volume: 1000 },
    { keyword: "best football boots for kids", volume: 700 },
  ]);
  assert.equal(clusters.length, 2);
});

test("clusters are sorted by combined volume, highest first", () => {
  const clusters = clusterKeywords([
    { keyword: "low volume topic", volume: 10 },
    { keyword: "high volume topic", volume: 5000 },
  ]);
  assert.equal(clusters[0].label, "high volume topic");
});

test("dedupeKeywords collapses exact token-set duplicates, keeping the higher-volume entry", () => {
  const deduped = dedupeKeywords([
    { keyword: "football academy trials", volume: 500 },
    { keyword: "Football Academy Trials", volume: 1300 },
  ]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].volume, 1300);
});
