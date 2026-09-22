import { DOMAIN_DENYLIST, PATH_DENY_PATTERNS, RELEVANCE_KEYWORDS } from "../config.mjs";

// Registrable-ish domain extraction: strips subdomains down to the last two
// labels (fine for .co.uk it keeps three - handled explicitly below since
// naive last-two-labels would cut "co.uk" off a UK domain).
export function registrableDomain(host) {
  const parts = host.toLowerCase().replace(/^www\./, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  const ukTwoPart = ["co.uk", "org.uk", "gov.uk", "ac.uk", "sch.uk", "me.uk", "net.uk"];
  const lastTwo = parts.slice(-2).join(".");
  if (ukTwoPart.includes(lastTwo)) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

export function isDenylistedDomain(domain) {
  const reg = registrableDomain(domain);
  return DOMAIN_DENYLIST.some((d) => reg === d || reg.endsWith(`.${d}`));
}

export function isDenylistedPath(url) {
  return PATH_DENY_PATTERNS.some((re) => re.test(url));
}

// 0-1 relevance score from keyword overlap against title+snippet. Not a
// hard filter by itself - callers combine this with the denylist checks.
export function relevanceScore(text) {
  const lower = (text || "").toLowerCase();
  if (!lower) return 0;
  let hits = 0;
  for (const kw of RELEVANCE_KEYWORDS) {
    if (lower.includes(kw)) hits += 1;
  }
  return Math.min(1, hits / 4); // 4+ keyword hits = fully relevant
}

export function isUkRelevant({ domain, text }) {
  const reg = registrableDomain(domain);
  if (reg.endsWith(".uk")) return true;
  const lower = (text || "").toLowerCase();
  return /\buk\b|united kingdom|england|scotland|wales|northern ireland/.test(lower);
}
