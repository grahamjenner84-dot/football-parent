// Classifies a referrer hostname into a traffic-source group. Read-time
// classification (not stored) so new sources can be added later and applied
// retroactively to already-logged rows - see the page_views_referrer
// migration comment.
//
// Known limitations, not fixable from hostname alone:
// - Bing Copilot / Bing Chat shares the bing.com hostname with plain Bing
//   search - both land in "Bing", can't be split apart.
// - Grok on x.com shares its hostname with X/Twitter itself - both land in
//   "X (Twitter)".
// - In-app browsers (Instagram, TikTok, Facebook) frequently strip or blank
//   the referrer entirely, so those apps' true share is undercounted here,
//   landing in "Direct" instead - a known industry-wide limitation, not
//   specific to this implementation.
// - "Direct" is therefore a mix of genuine direct/bookmark/typed-URL visits
//   plus every case where the browser or an extension blocked the referrer.

export type SourceGroup = "Search" | "Social" | "AI" | "Direct" | "Internal" | "Other";

export interface ClassifiedSource {
  group: SourceGroup;
  label: string;
}

const SITE_HOSTNAME = "www.footballparent.co.uk";

// Ordered by specificity - checked top to bottom, first match wins, so a
// more specific subdomain (e.g. gemini.google.com) must be listed before a
// broader one (google.com) would otherwise swallow it. Matching is by exact
// hostname or hostname suffix (".example.com"), not substring.
const KNOWN_SOURCES: { host: string; group: SourceGroup; label: string }[] = [
  // AI - subdomains checked before their parent search engines
  { host: "gemini.google.com", group: "AI", label: "Gemini" },
  { host: "chatgpt.com", group: "AI", label: "ChatGPT" },
  { host: "chat.openai.com", group: "AI", label: "ChatGPT" },
  { host: "perplexity.ai", group: "AI", label: "Perplexity" },
  { host: "claude.ai", group: "AI", label: "Claude" },
  { host: "meta.ai", group: "AI", label: "Meta AI" },
  { host: "you.com", group: "AI", label: "You.com" },
  { host: "deepseek.com", group: "AI", label: "DeepSeek" },
  { host: "chat.deepseek.com", group: "AI", label: "DeepSeek" },
  { host: "poe.com", group: "AI", label: "Poe" },
  { host: "copilot.microsoft.com", group: "AI", label: "Copilot" },

  // Search
  { host: "google.com", group: "Search", label: "Google" },
  { host: "google.co.uk", group: "Search", label: "Google" },
  { host: "bing.com", group: "Search", label: "Bing" },
  { host: "duckduckgo.com", group: "Search", label: "DuckDuckGo" },
  { host: "yahoo.com", group: "Search", label: "Yahoo" },
  { host: "search.yahoo.com", group: "Search", label: "Yahoo" },
  { host: "ecosia.org", group: "Search", label: "Ecosia" },
  { host: "search.brave.com", group: "Search", label: "Brave Search" },
  { host: "yandex.com", group: "Search", label: "Yandex" },
  { host: "yandex.ru", group: "Search", label: "Yandex" },
  { host: "baidu.com", group: "Search", label: "Baidu" },

  // Social
  { host: "facebook.com", group: "Social", label: "Facebook" },
  { host: "instagram.com", group: "Social", label: "Instagram" },
  { host: "tiktok.com", group: "Social", label: "TikTok" },
  { host: "youtube.com", group: "Social", label: "YouTube" },
  { host: "youtu.be", group: "Social", label: "YouTube" },
  { host: "pinterest.com", group: "Social", label: "Pinterest" },
  { host: "pinterest.co.uk", group: "Social", label: "Pinterest" },
  { host: "x.com", group: "Social", label: "X (Twitter)" },
  { host: "twitter.com", group: "Social", label: "X (Twitter)" },
  { host: "t.co", group: "Social", label: "X (Twitter)" },
  { host: "reddit.com", group: "Social", label: "Reddit" },
  { host: "linkedin.com", group: "Social", label: "LinkedIn" },
  { host: "threads.net", group: "Social", label: "Threads" },
];

function matches(hostname: string, known: string): boolean {
  return hostname === known || hostname.endsWith(`.${known}`);
}

export function classifyReferrerHost(referrerHost: string | null | undefined): ClassifiedSource {
  if (!referrerHost) return { group: "Direct", label: "Direct" };

  const host = referrerHost.toLowerCase().trim();
  if (!host) return { group: "Direct", label: "Direct" };
  if (matches(host, SITE_HOSTNAME)) return { group: "Internal", label: "Internal" };

  for (const known of KNOWN_SOURCES) {
    if (matches(host, known.host)) return { group: known.group, label: known.label };
  }

  return { group: "Other", label: host };
}
