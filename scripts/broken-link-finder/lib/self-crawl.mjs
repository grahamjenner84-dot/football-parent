// Free, DataForSEO-free link checking. Built after discovering DataForSEO's
// on_page is_broken flag only catches hard HTTP failures (4xx/5xx/DNS) - it
// does NOT catch the classic expired-domain pattern: a domain lapses, gets
// re-registered by a squatter/parking service, and now 200s/301s to a
// completely unrelated site. That pattern is exactly what Stage 6's
// "acquisition candidate" logic cares about, so it has to be caught here,
// not left to DataForSEO's per-link status check.
import { registrableDomain, isDenylistedDomain, relevanceScore } from "./relevance-filters.mjs";
import { CONFIG } from "../config.mjs";

const USER_AGENT = "FootballParent-BrokenLinkChecker/1.0 (+https://www.footballparent.co.uk)";
const ASSET_EXTENSIONS = /\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|pdf|zip|mp4|mp3)(\?|#|$)/i;

// A raw "the domain changed" signal is mostly noise: legitimate same-org
// rebrands (thefa.com -> englandfootball.com) and URL shorteners (wa.me)
// vastly outnumber genuine expired/squatted domains in real data (confirmed
// against a real 150-page run: only a handful of ~100 "different domain"
// hits were actual squats). These two checks separate the two.
const KNOWN_SAFE_REDIRECT_DOMAINS = new Set([
  "whatsapp.com", "wa.me", "bit.ly", "t.co", "tinyurl.com", "goo.gl", "lnkd.in", "youtu.be", "youtube.com", "forms.gle",
]);
const PARKING_DOMAIN_SIGNALS = ["expireddomain", "godaddy", "sedo", "parkingcrew", "hugedomains", "dan.com", "afternic", "bodis", "parklogic", "domainmarket", "above.com"];

function extractTitle(html) {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html || "");
  return match ? match[1].trim() : "";
}

async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal, headers: { "User-Agent": USER_AGENT, ...(opts?.headers ?? {}) } });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, opts, timeoutMs, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, opts, timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function fetchPageHtml(url) {
  try {
    const res = await fetchWithRetry(url, { redirect: "follow" }, 10000);
    if (!res.ok) return { html: null, error: `HTTP ${res.status}` };
    const html = await res.text();
    return { html, error: null };
  } catch (err) {
    return { html: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// Regex-based extraction (no HTML parser dependency, per the project's
// avoid-unnecessary-dependencies constraint). Good enough for <a href> tags
// on the kind of small, simple club/school sites this targets.
export function extractExternalLinks(html, pageUrl) {
  const pageHost = new URL(pageUrl).hostname;
  const anchorRe = /<a\s+([^>]*)href=["']([^"'#][^"']*)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  const seen = new Set();
  const out = [];

  let match;
  while ((match = anchorRe.exec(html)) !== null) {
    const rawHref = match[2];
    const attrs = `${match[1]} ${match[3]}`;
    const relMatch = /rel=["']([^"']*)["']/i.exec(attrs);
    const isNofollow = relMatch ? /nofollow/i.test(relMatch[1]) : false;
    const anchorText = match[4].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (/^(mailto|tel|javascript):/i.test(rawHref)) continue;

    let absolute;
    try {
      absolute = new URL(rawHref, pageUrl).toString();
    } catch {
      continue;
    }
    if (ASSET_EXTENSIONS.test(absolute)) continue;

    let host;
    try {
      host = new URL(absolute).hostname;
    } catch {
      continue;
    }
    if (registrableDomain(host) === registrableDomain(pageHost)) continue; // internal, not interesting
    if (isDenylistedDomain(host)) continue; // social/generic noise

    if (seen.has(absolute)) continue;
    seen.add(absolute);
    out.push({ url: absolute, domain: registrableDomain(host), anchorText, isNofollow });
  }
  return out;
}

// The actual check: does this link still land where it claims to? Outcomes:
// "ok" - resolves, same registrable domain as requested (possibly after a
//   same-domain redirect, e.g. http->https or a trailing slash), or a known
//   shortener (wa.me etc) - never an opportunity.
// "broken" - network/DNS failure or a 4xx/5xx final status - the classic
//   dead-page case.
// "redirected_same_topic" - lands on a different domain, but that page is
//   still football/grassroots-relevant - almost always a legitimate
//   same-organisation rebrand (thefa.com -> englandfootball.com), not an
//   opportunity, but kept (low priority) rather than silently dropped.
// "redirected_unrelated_topic" / "likely_expired_domain_parked" - lands on a
//   different domain AND that page has nothing to do with football - the
//   real signal: the original domain most likely expired and was
//   re-registered for something unrelated (parking, ads, squatting).
export async function checkLinkStatus(url) {
  const originalDomain = registrableDomain(new URL(url).hostname);
  try {
    let res;
    let body = null;
    try {
      res = await fetchWithRetry(url, { method: "HEAD", redirect: "follow" }, CONFIG.linkCheckTimeoutMs ?? 10000, 1);
      if (res.status === 405 || res.status === 403) throw new Error("HEAD rejected, retry with GET");
    } catch {
      res = await fetchWithRetry(url, { method: "GET", redirect: "follow" }, CONFIG.linkCheckTimeoutMs ?? 10000, 1);
      body = await res.text().catch(() => "");
    }

    const finalDomain = registrableDomain(new URL(res.url || url).hostname);
    if (res.status >= 400) return { status: "broken", httpStatus: res.status, finalUrl: res.url, finalDomain };
    if (finalDomain === originalDomain) return { status: "ok", httpStatus: res.status, finalUrl: res.url, finalDomain };
    if (KNOWN_SAFE_REDIRECT_DOMAINS.has(finalDomain)) return { status: "ok", httpStatus: res.status, finalUrl: res.url, finalDomain };

    if (PARKING_DOMAIN_SIGNALS.some((s) => finalDomain.includes(s))) {
      return { status: "likely_expired_domain_parked", httpStatus: res.status, finalUrl: res.url, finalDomain };
    }

    // Need the body to judge topic drift - fetch it now if the HEAD path
    // didn't already give us one.
    if (body === null) {
      try {
        const getRes = await fetchWithRetry(res.url || url, { method: "GET", redirect: "follow" }, CONFIG.linkCheckTimeoutMs ?? 10000, 1);
        body = await getRes.text().catch(() => "");
      } catch {
        body = "";
      }
    }
    const topicScore = relevanceScore(`${extractTitle(body)} ${body.slice(0, 2000)}`);
    const status = topicScore > 0 ? "redirected_same_topic" : "redirected_unrelated_topic";
    return { status, httpStatus: res.status, finalUrl: res.url, finalDomain };
  } catch (err) {
    return { status: "broken", httpStatus: null, finalUrl: null, finalDomain: originalDomain, error: err instanceof Error ? err.message : String(err) };
  }
}
