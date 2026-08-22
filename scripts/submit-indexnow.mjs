#!/usr/bin/env node
/**
 * Submit URLs to IndexNow (Bing, Yandex - not Google, which doesn't support
 * the protocol) so those engines recrawl instantly instead of waiting for
 * their own schedule.
 *
 * Key file: public/b5ca026b56fd32a037caf1ef9a4c876f.txt (committed, not
 * secret - IndexNow ownership is proven by serving this exact file at the
 * site root, so it has to be public).
 *
 * Usage:
 *   node scripts/submit-indexnow.mjs /academy-pathway/some-guide /parent-guides/another-guide
 *   node scripts/submit-indexnow.mjs --all              # every route in app/sitemap.ts
 */

import path from "path";
import { fileURLToPath } from "url";
import { routes } from "../app/sitemap.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const HOST = "www.footballparent.co.uk";
const SITE_URL = `https://${HOST}`;
const KEY = "b5ca026b56fd32a037caf1ef9a4c876f";
const KEY_LOCATION = `${SITE_URL}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

function toAbsoluteUrl(input) {
  if (input.startsWith("http://") || input.startsWith("https://")) return input;
  return `${SITE_URL}${input.startsWith("/") ? input : `/${input}`}`;
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/submit-indexnow.mjs <path> [<path> ...] | --all");
  process.exit(1);
}

const urlList = args.includes("--all")
  ? routes.map((route) => `${SITE_URL}${route}`)
  : args.map(toAbsoluteUrl);

console.log(`Submitting ${urlList.length} URL(s) to IndexNow:`);
for (const url of urlList) console.log(`  ${url}`);

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  }),
});

console.log(`\nIndexNow response: ${res.status} ${res.statusText}`);
if (!res.ok) {
  const body = await res.text().catch(() => "");
  if (body) console.log(body);
  process.exit(1);
}
