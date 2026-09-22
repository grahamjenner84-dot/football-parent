// Internet Archive Wayback Machine - free, not a DataForSEO call. Used to
// recover what a dead page used to be about (Stage 4).
import { cacheKeyFor, readCache, writeCache } from "./cache.mjs";
import { CONFIG } from "../config.mjs";

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim().replace(/\s+/g, " ") : "";
}

function extractMetaDescription(html) {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  return match ? match[1].trim() : "";
}

export async function lookupWaybackSnapshot(url) {
  if (!CONFIG.waybackEnabled) return { snapshotUrl: null, title: "", description: "", error: null };

  const cacheKey = cacheKeyFor("wayback", { url });
  const cached = readCache("wayback", cacheKey, CONFIG.cacheTtlDays.wayback);
  if (cached) return cached;

  try {
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=5&filter=statuscode:200&collapse=urlkey`;
    const cdxRes = await fetchWithTimeout(cdxUrl, CONFIG.waybackTimeoutMs);
    if (!cdxRes.ok) {
      const result = { snapshotUrl: null, title: "", description: "", error: `cdx HTTP ${cdxRes.status}` };
      writeCache("wayback", cacheKey, result);
      return result;
    }
    const rows = await cdxRes.json();
    if (!Array.isArray(rows) || rows.length < 2) {
      const result = { snapshotUrl: null, title: "", description: "", error: "no snapshots found" };
      writeCache("wayback", cacheKey, result);
      return result;
    }
    const [, timestamp, original] = rows[rows.length - 1]; // most recent 200 snapshot
    const snapshotUrl = `https://web.archive.org/web/${timestamp}/${original}`;

    let title = "";
    let description = "";
    try {
      const pageRes = await fetchWithTimeout(snapshotUrl, CONFIG.waybackTimeoutMs);
      if (pageRes.ok) {
        const html = await pageRes.text();
        title = extractTitle(html);
        description = extractMetaDescription(html);
      }
    } catch {
      // snapshot page fetch failed - CDX metadata alone is still useful
    }

    const result = { snapshotUrl, title, description, error: null };
    writeCache("wayback", cacheKey, result);
    return result;
  } catch (err) {
    return { snapshotUrl: null, title: "", description: "", error: err instanceof Error ? err.message : String(err) };
  }
}
