// Free domain-alive checks (DNS + HTTP) for Stage 6. No WHOIS/availability
// API call is made - per the brief, domains needing acquisition judgement
// are flagged for manual WHOIS/registrar investigation instead of guessed at.
import dns from "node:dns/promises";
import { cacheKeyFor, readCache, writeCache } from "./cache.mjs";
import { CONFIG } from "../config.mjs";

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkDomain(domain) {
  const cacheKey = cacheKeyFor("domain_check", { domain });
  const cached = readCache("domain_check", cacheKey, CONFIG.cacheTtlDays.domain_check);
  if (cached) return cached;

  let resolves = false;
  try {
    await dns.lookup(domain);
    resolves = true;
  } catch {
    resolves = false;
  }

  let httpStatus = null;
  let redirectsTo = null;
  if (resolves) {
    try {
      const res = await fetchWithTimeout(`https://${domain}`, 8000);
      httpStatus = res.status;
      if (res.status >= 300 && res.status < 400) redirectsTo = res.headers.get("location");
    } catch {
      try {
        const res = await fetchWithTimeout(`http://${domain}`, 8000);
        httpStatus = res.status;
        if (res.status >= 300 && res.status < 400) redirectsTo = res.headers.get("location");
      } catch {
        httpStatus = null;
      }
    }
  }

  const appearsDead = !resolves || httpStatus === null || httpStatus >= 500;
  const result = {
    resolves,
    httpStatus,
    redirectsTo,
    appearsDead,
  };
  writeCache("domain_check", cacheKey, result);
  return result;
}
